
// hooks/usePersistentState.ts
// FIX: Imported Dispatch and SetStateAction to resolve React namespace errors.
import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
// FIX: Imported DATA_VERSION from migrations to get the correct data version.
import { DATA_VERSION, runMigrations } from '../migrations';
import { DEFAULT_APP_STATE } from '../constants';

const APP_STATE_KEY = 'kanchana-events-hub-state';
// FIX: Removed incorrect DATA_VERSION definition. The correct one is now imported from migrations.ts.


/**
 * Runs all necessary migration functions sequentially to bring
 * the old state up to the current DATA_VERSION.
 */


// --- Helper functions for the Three-Way Merge ---
const isObject = (item: any): item is object => {
  return (item && typeof item === 'object' && !Array.isArray(item));
};

/**
 * Recursively merges properties from a source object into a target object.
 * It only adds properties from the source that are missing in the target,
 * preserving all of the target's existing values.
 * @param target The user's data object, which takes precedence.
 * @param source The default data object, used to fill in missing properties.
 */
const deepMerge = (target: any, source: any): any => {
  const output = { ...target };

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) { // If the source property is an object
        if (!(key in target) || !isObject(target[key])) {
          // If key is missing in target or target's value is not an object, just add the source object
          output[key] = source[key];
        } else {
          // Key exists in both and is an object, so recurse
          output[key] = deepMerge(target[key], source[key]);
        }
      } else { // If the source property is a primitive
        if (!(key in target)) {
          // If key is missing in target, add it
          output[key] = source[key];
        }
      }
    });
  }
  return output;
};


/**
 * The "Three-Way Merge" logic to combine default data with user data.
 * This function ensures that user-generated content is preserved while
 * new master data (like new services or new app settings) is added.
 * @param userData The user's data, loaded from storage.
 * @param defaultData The application's default initial state from constants.
 */
const mergeState = (userData: any, defaultData: any) => {
    // Start with a base of the default data, then spread user data on top.
    // This preserves all user-generated data for top-level keys like events, clients, etc.
    const merged = { ...defaultData, ...userData };

    // 1. Services: Add new master services without overwriting user changes.
    const userServices = userData.services || [];
    const defaultServices = defaultData.services || [];
    const userServiceIds = new Set(userServices.map((s: any) => s.id));
    const newMasterServices = defaultServices.filter((s: any) => !userServiceIds.has(s.id));
    if (newMasterServices.length > 0) {
        console.log(`Merging ${newMasterServices.length} new master services.`);
        merged.services = [...userServices, ...newMasterServices];
    } else {
        merged.services = userServices; // Ensure we only use the user's services if no new ones
    }

    // 2. Roles & Permissions: Add new permission flags to existing roles.
    const userRoles = userData.roles || {};
    const defaultRoles = defaultData.roles || {};
    const finalRoles = { ...defaultRoles }; // Start with default structure
    Object.keys(defaultRoles).forEach(role => {
        if (userRoles[role]) {
            // User's role exists, so merge it.
            // This ensures new permissions from defaultRoles are added,
            // while user's modifications to existing permissions are kept.
            finalRoles[role as keyof typeof finalRoles] = { ...defaultRoles[role as keyof typeof finalRoles], ...userRoles[role] };
        }
    });
    merged.roles = finalRoles;

    // 3. Settings (Deep Merge): Add new settings without overwriting user preferences.
    // The user's settings object is the `target`, the default is the `source`.
    merged.settings = deepMerge(userData.settings || {}, defaultData.settings);
    
    // 4. Proposal Templates: Ensure system defaults are present.
    const userTemplates = userData.proposalTemplates || [];
    const defaultTemplates = defaultData.proposalTemplates || [];
    const systemTemplates = defaultTemplates.filter((t: any) => t.templateType === 'system_default');
    
    // Add system templates if they are missing in user data (by ID)
    const userTemplateIds = new Set(userTemplates.map((t: any) => t.id));
    const newSystemTemplates = systemTemplates.filter((t: any) => !userTemplateIds.has(t.id));
    
    if (newSystemTemplates.length > 0) {
        console.log(`Merging ${newSystemTemplates.length} system proposal templates.`);
        merged.proposalTemplates = [...userTemplates, ...newSystemTemplates];
    } else {
        merged.proposalTemplates = userTemplates;
    }

    return merged;
};

const loadStateFromStorage = (initialState: any) => {
    try {
      const item = localStorage.getItem(APP_STATE_KEY);
      
      // Step 1: Check for User Data. If none, it's a first-time launch.
      if (!item) {
        console.log("No stored data found. Initializing with default state.");
        return initialState;
      }
      
      const stored = JSON.parse(item);
      const storedVersion = stored.version || 0;
      let userData = stored; // In older versions, data was not nested
      
      // Handle nested data structure for newer versions
      if ('data' in stored && 'version' in stored) {
          userData = stored.data;
      }
      
      // Step 2: Check for Version Mismatch and run migrations if needed.
      if (storedVersion < DATA_VERSION) {
        console.log(`Stored data version (${storedVersion}) is older than master version (${DATA_VERSION}). Migrating...`);
        userData = runMigrations(userData, storedVersion);
      }
      
      // Step 3: Perform the Three-Way Merge
      console.log("Merging stored user data with application defaults.");
      const mergedData = mergeState(userData, initialState);
      
      return mergedData;

    } catch (error) {
      console.error(`Error loading state from localStorage, resetting to default:`, error);
      localStorage.removeItem(APP_STATE_KEY);
      return initialState;
    }
};


/**
 * Custom hook to manage application state with persistence
 * to localStorage, including data versioning and migration.
 */
// FIX: Updated function signature with imported React types to resolve namespace errors.
export const usePersistentState = (initialState: any): [any, Dispatch<SetStateAction<any>>, () => void] => {
  const [state, setState] = useState(() => loadStateFromStorage(initialState));

  useEffect(() => {
    try {
      // The state itself is the data now, add version to it for saving.
      const itemToStore = {
        ...state,
        version: DATA_VERSION,
      };
      localStorage.setItem(APP_STATE_KEY, JSON.stringify(itemToStore));
    } catch (error) {
      console.error(`Error saving state to localStorage:`, error);
    }
  }, [state]);
  
  const refreshState = useCallback(() => {
    const refreshedState = loadStateFromStorage(initialState);
    setState(refreshedState);
  }, [initialState]);

  return [state, setState, refreshState];
};
