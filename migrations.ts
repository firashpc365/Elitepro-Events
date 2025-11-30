
// migrations.ts

import type { Role, Permissions } from "./types";

/**
 * The current version of the application's data structure.
 * Increment this number whenever a breaking change is made to the state shape.
 */
export const DATA_VERSION = 13;

/**
 * A map of migration functions.
 * Each key represents the version number to migrate TO.
 * The function receives the state from the previous version (key - 1)
 * and must return the state in the new version's shape.
 */
export const migrations: { [key: number]: (oldState: any) => any } = {
  2: (stateV1) => {
    // This migration removes the old, granular services that have been replaced
    // by the new high-level master service list.
    const servicesToRemove = [
      's-print-1', 's-print-2', 's-av-1', 's-av-2', 's-ent-1', 's-ent-2'
    ];
    
    // Ensure services exist before trying to filter
    const currentServices = stateV1.services || [];
    
    return {
      ...stateV1,
      services: currentServices.filter((service: any) => !servicesToRemove.includes(service.id)),
    };
  },
  3: (stateV2) => {
    // This migration adds a `roles` configuration to the root of the state
    // and removes the now-redundant `permissions` property from each user object.

    const PERMISSIONS_V2: { [key in Role]: Permissions } = {
      Admin: { canCreateEvents: true, canManageServices: true, canViewFinancials: true, canManageUsers: true, canManageRFQs: true },
      Sales: { canCreateEvents: true, canManageServices: false, canViewFinancials: false, canManageUsers: false, canManageRFQs: true },
      Operations: { canCreateEvents: false, canManageServices: true, canViewFinancials: true, canManageUsers: false, canManageRFQs: false },
    };

    const migratedState = {
      ...stateV2,
      // Add roles config, ensuring not to overwrite if it somehow already exists
      roles: stateV2.roles || PERMISSIONS_V2,
    };

    // Remove `permissions` property from each user in the users array
    if (migratedState.users && Array.isArray(migratedState.users)) {
      migratedState.users = migratedState.users.map((user: any) => {
        // Use object destructuring to omit the 'permissions' property
        const { permissions, ...restOfUser } = user;
        return restOfUser;
      });
    }

    return migratedState;
  },
  4: (stateV3) => {
      // Rename Admin user from "Admin Alex" to "Firash"
      if (stateV3.users && Array.isArray(stateV3.users)) {
          stateV3.users = stateV3.users.map((user: any) => {
              if (user.userId === 'u1') {
                  return { ...user, name: 'Firash' };
              }
              return user;
          });
      }
      return stateV3;
  },
  5: (stateV4) => {
      // Reset users to Paul and Admin
      // Reassign existing events to Paul so he has data to see
      const newUsers = [
        { userId: 'u_admin', name: 'Admin', role: 'Admin', commissionRate: 0 },
        { userId: 'u_paul', name: 'Paul', role: 'Sales', commissionRate: 15 }
      ];
      
      let updatedEvents = stateV4.events || [];
      if (Array.isArray(updatedEvents)) {
          updatedEvents = updatedEvents.map((event: any) => {
              return { ...event, salespersonId: 'u_paul' };
          });
      }

      return {
          ...stateV4,
          users: newUsers,
          events: updatedEvents,
          currentUserId: 'u_paul', // Auto-switch to Paul
      };
  },
  6: (stateV5) => {
      // Rename Admin to Firash
      let updatedUsers = stateV5.users || [];
      if (Array.isArray(updatedUsers)) {
          updatedUsers = updatedUsers.map((user: any) => {
              if (user.userId === 'u_admin') {
                  return { ...user, name: 'Firash' };
              }
              return user;
          });
      }
      return {
          ...stateV5,
          users: updatedUsers
      };
  },
  7: (stateV6) => {
    // Force rename Admin to Firash again to ensure consistency if missed
    let updatedUsers = stateV6.users || [];
    if (Array.isArray(updatedUsers)) {
        updatedUsers = updatedUsers.map((user: any) => {
            if (user.userId === 'u_admin') {
                return { ...user, name: 'Firash' };
            }
            return user;
        });
    }
    return {
        ...stateV6,
        users: updatedUsers
    };
  },
  8: (stateV7) => {
    // Add 'tasks' array to all events if missing
    let updatedEvents = stateV7.events || [];
    if (Array.isArray(updatedEvents)) {
        updatedEvents = updatedEvents.map((event: any) => {
            return { ...event, tasks: event.tasks || [] };
        });
    }
    return {
        ...stateV7,
        events: updatedEvents
    };
  },
  9: (stateV8) => {
    // Add 'items' array to all RFQs if missing
    let updatedRFQs = stateV8.rfqs || [];
    if (Array.isArray(updatedRFQs)) {
        updatedRFQs = updatedRFQs.map((rfq: any) => {
            return { ...rfq, items: rfq.items || [] };
        });
    }
    return {
        ...stateV8,
        rfqs: updatedRFQs
    };
  },
  10: (stateV9) => {
      // Import new Catering Services from Menus
      const now = new Date().toISOString();
      const newCateringServices = [
          {
              id: 's-mig-10-1',
              name: 'Morning Breakfast Buffet (VIP)',
              category: 'Catering',
              description: 'Comprehensive breakfast spread including bread display, croissants, rustic bites, mini manakish, foul & balila, hot display (grilled vegetables, halloumi), pancakes, waffles, and beverages.',
              basePrice: 180,
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Live Station', 'International Selection', 'Beverages Included'],
              menuOptions: ['Assortment of croissants', 'Rustic Bites', 'Mini manakish', 'Foul & balila', 'Grilled Halloumi', 'Pancakes', 'Cheese kunafa'],
              displayPrice: true
          },
          {
              id: 's-mig-10-2',
              name: 'Coffee Break (AM - Option A)',
              category: 'Catering',
              description: 'Premium morning refreshment break. Includes bread display, croissants, rustic bites, english cake, cookies, pancakes, yogurt jars, fruit display, and full beverage station.',
              basePrice: 120,
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Premium Selection', '3 Hour Duration'],
              menuOptions: ['Bread Display', 'Croissants', 'Rustic Bites', 'English Cake', 'Pancakes', 'Yogurt Jars', 'Fresh Juices'],
              displayPrice: true
          },
          {
              id: 's-mig-10-3',
              name: 'Coffee Break (AM - Option B)',
              category: 'Catering',
              description: 'Standard morning break featuring rustic bites, croissants, mini manakish, english cake, cookies, yogurt jars, fruit cuts, and beverages.',
              basePrice: 100,
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Standard Selection', '3 Hour Duration'],
              menuOptions: ['Rustic Bites', 'Croissants', 'Mini Manakish', 'English Cake', 'Cookies', 'Yogurt Jars', 'Fresh Juices'],
              displayPrice: true
          },
          {
              id: 's-mig-10-4',
              name: 'Coffee Break (AM - Option C)',
              category: 'Catering',
              description: 'Essential morning break with croissants, mini manakish, english cake, cookies, fruit cuts, and beverages.',
              basePrice: 80,
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Essential Selection', '3 Hour Duration'],
              menuOptions: ['Croissants', 'Mini Manakish', 'English Cake', 'Cookies', 'Fruit Cuts', 'Fresh Juices'],
              displayPrice: true
          },
          {
              id: 's-mig-10-5',
              name: 'Coffee Break (PM - Option A)',
              category: 'Catering',
              description: 'Premium afternoon break featuring brioche buns, club sandwiches, dips, mini gateaux, eclairs, tarts, verrines, brownies, fruit, and beverages.',
              basePrice: 120,
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Premium Sweets', 'Savory Selection', '3 Hour Duration'],
              menuOptions: ['Brioche Buns', 'Club Sandwiches', 'Mini Gateaux', 'Eclairs', 'Tarts', 'Brownies', 'Fresh Juices'],
              displayPrice: true
          },
          {
              id: 's-mig-10-6',
              name: 'Coffee Break (PM - Option B)',
              category: 'Catering',
              description: 'Standard afternoon break with club sandwiches, dips, eclairs, tarts, verrines, brownies, fruit, and beverages.',
              basePrice: 100,
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Standard Sweets', 'Savory Selection', '3 Hour Duration'],
              menuOptions: ['Club Sandwiches', 'Vegetable Shooters', 'Eclairs', 'Tarts', 'Brownies', 'Fresh Juices'],
              displayPrice: true
          },
          {
              id: 's-mig-10-7',
              name: 'Coffee Break (PM - Option C)',
              category: 'Catering',
              description: 'Essential afternoon break including club sandwiches, dips, eclairs, verrines, fruit, and beverages.',
              basePrice: 80,
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Essential Sweets', '3 Hour Duration'],
              menuOptions: ['Club Sandwiches', 'Vegetable Shooters', 'Eclairs', 'Verrines', 'Fresh Juices'],
              displayPrice: true
          },
          {
              id: 's-mig-10-8',
              name: 'International Buffet (Option A)',
              category: 'Catering',
              description: 'Full international and oriental buffet. Includes cold appetizers, salads, hot appetizers (fatayer, spring rolls), main courses (hamour, butter chicken, lamb kabsa, pasta), and assorted desserts.',
              basePrice: 0, // On Request
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Multi-Cuisine', 'Hot & Cold Appetizers', 'Dessert Station'],
              menuOptions: ['Hummus', 'Vine Leaves', 'Tabbouleh', 'Caesar Salad', 'Spinach Fatayer', 'Baked Hamour', 'Butter Chicken', 'Lamb Kabsa', 'Cheesecake'],
              displayPrice: false
          },
          {
              id: 's-mig-10-9',
              name: 'High Tea Menu (Mini Sandwiches)',
              category: 'Catering',
              description: 'Elegant high tea selection with mini sandwiches (salami, chicken roulade), hot bites (falafel, halloumi), bakery items, and desserts.',
              basePrice: 0, // On Request
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Finger Foods', 'Elegant Presentation'],
              menuOptions: ['Italian Beef Salami', 'Chicken Roulade', 'Falafel Wrap', 'Halloumi Wrap', 'Mix Croissant', 'Um Ali', 'Donuts'],
              displayPrice: false
          },
          {
              id: 's-mig-10-10',
              name: 'Continental Lunch/Dinner',
              category: 'Catering',
              description: 'Continental menu featuring starters (hummus, caesar salad), main courses (mixed grill, beef stroganoff, biryani), and desserts.',
              basePrice: 0, // On Request
              pricingType: 'Per Person',
              status: 'Active',
              createdAt: now,
              lastModifiedAt: now,
              keyFeatures: ['Continental Classics', 'Buffet Style'],
              menuOptions: ['Chicken Caesar Salad', 'Fried Cauliflower', 'Oriental Mixed Grill', 'Beef Stroganoff', 'Chicken Biryani', 'Pasta Bechamel', 'Chocolate Cake'],
              displayPrice: false
          }
      ];

      return {
          ...stateV9,
          services: [...(stateV9.services || []), ...newCateringServices]
      };
  },
  11: (stateV10) => {
    // Migration to add Venue Rental if missing
    const now = new Date().toISOString();
    const newService = {
        id: 's-ven-001',
        name: 'Venue Rental',
        category: 'Venue',
        description: 'Exclusive rental of our main ballroom with seating for up to 300 guests.',
        basePrice: 5000,
        pricingType: 'Flat Fee',
        status: 'Active',
        createdAt: now,
        lastModifiedAt: now,
        keyFeatures: ['300 Guests Capacity', 'Ballroom', 'Exclusive Use'],
        displayPrice: true
    };
    
    const currentServices = stateV10.services || [];
    // Avoid duplicates if run multiple times or if exists
    if (currentServices.some((s: any) => s.id === newService.id)) {
        return stateV10;
    }
    
    return {
        ...stateV10,
        services: [...currentServices, newService]
    };
  },
  12: (stateV11) => {
    const now = new Date().toISOString();
    const newServices = [
        {
            id: 's-av-003',
            name: 'Projector & Screen Package',
            category: 'AV & Lighting',
            description: 'High-lumen projector with a portable 100-inch screen. Ideal for breakout rooms.',
            basePrice: 800,
            pricingType: 'Flat Fee',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Full HD', 'HDMI/VGA', 'Portable'],
            displayPrice: true
        },
        {
            id: 's-av-004',
            name: 'Stage Lighting Kit (Moving Heads)',
            category: 'AV & Lighting',
            description: 'Set of 4 moving head wash lights and 4 par cans to create dynamic stage atmosphere.',
            basePrice: 2000,
            pricingType: 'Flat Fee',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Dynamic Colors', 'DMX Control', 'Setup Included'],
            displayPrice: true
        },
        {
            id: 's-dec-002',
            name: 'Custom Event Backdrop (3m x 2.4m)',
            category: 'Decor & Styling',
            description: 'Printed backdrop with custom branding or thematic design. Includes stand installation.',
            basePrice: 1200,
            pricingType: 'Flat Fee',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Custom Print', 'Photo Op', 'Branding'],
            displayPrice: true
        },
        {
            id: 's-dec-003',
            name: 'Luxury Table Setting',
            category: 'Decor & Styling',
            description: 'Premium charger plates, napkin rings, and fine cutlery setup per seat.',
            basePrice: 25,
            pricingType: 'Per Person',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Gold/Silver Options', 'Elegant', 'Full Set'],
            displayPrice: true
        },
        {
            id: 's-stf-002',
            name: 'Security Guard (8 Hours)',
            category: 'Staffing',
            description: 'Licensed security personnel for event safety and access control.',
            basePrice: 500,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Uniformed', 'Access Control', 'Safety'],
            displayPrice: true
        },
        {
            id: 's-stf-003',
            name: 'Event Coordinator (On-site)',
            category: 'Staffing',
            description: 'Dedicated coordinator to manage vendors and timeline on the event day.',
            basePrice: 1500,
            pricingType: 'Flat Fee',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Timeline Management', 'Vendor POC', 'Problem Solving'],
            displayPrice: true
        },
        {
            id: 's-photo-2',
            name: 'Cinematic Videography',
            category: 'Photography',
            description: 'Full day video coverage with edited highlight reel (3-5 mins) and full ceremony footage.',
            basePrice: 4500,
            pricingType: 'Flat Fee',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['4K Quality', 'Drone Shots', 'Professional Editing'],
            displayPrice: true
        },
        {
            id: 's-log-002',
            name: 'Luxury Chauffeur Service (10 Hours)',
            category: 'Logistics',
            description: 'Premium sedan with professional driver for VIP transport.',
            basePrice: 1200,
            pricingType: 'Flat Fee',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Luxury Sedan', 'Professional Driver', 'Fuel Included'],
            displayPrice: true
        }
    ];

    const currentServices = stateV11.services || [];
    const addedServices = newServices.filter(ns => !currentServices.some((cs: any) => cs.id === ns.id));

    if (addedServices.length === 0) {
        return stateV11;
    }

    return {
        ...stateV11,
        services: [...currentServices, ...addedServices]
    };
  },
  13: (stateV12) => {
      const now = new Date().toISOString();
      const newServices = [
        // Elitepro Services
        {
            id: 's-ep-001',
            name: 'Large Naimi Lambs (18-20kg each) - Option A',
            category: 'Catering',
            description: 'Magnificent, perfectly roasted Naimi Lambs, serving as a captivating centerpiece that delivers exceptional tenderness, rich authentic flavors, and generous portions. Quantity: 2 units.',
            basePrice: 3000,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Roasted Whole', 'Authentic Flavor', 'Centerpiece'],
            displayPrice: true
        },
        {
            id: 's-ep-002',
            name: 'Large Naimi Lambs (18-20kg each) - Option B',
            category: 'Catering',
            description: 'Magnificent, perfectly roasted Naimi Lambs, serving as a captivating centerpiece that delivers exceptional tenderness, rich authentic flavors, and generous portions. Quantity: 2 units.',
            basePrice: 2650,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Roasted Whole', 'Authentic Flavor', 'Centerpiece'],
            displayPrice: true
        },
        {
            id: 's-ep-003',
            name: 'Pre-plated Mixed Salad',
            category: 'Catering',
            description: 'Meticulously crafted, pre-plated mixed salad, offering a vibrant and refreshing start served with exquisite presentation.',
            basePrice: 40,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Pre-plated', 'Fresh Vegetables', 'Exquisite Presentation'],
            displayPrice: true
        },
        {
            id: 's-ep-004',
            name: 'Coffee & Tea Service',
            category: 'Catering',
            description: 'Full service for coffee and tea selection.',
            basePrice: 1550,
            pricingType: 'Flat Fee',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Full Service', 'Coffee Selection', 'Tea Selection'],
            displayPrice: true
        },
        {
            id: 's-ep-005',
            name: 'Bottled Water (Small)',
            category: 'Catering',
            description: 'Easily accessible, individual bottled water, providing essential refreshment.',
            basePrice: 100,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Individual Bottles', 'Essential Refreshment'],
            displayPrice: true
        },
        {
            id: 's-ep-006',
            name: 'Saudi Traditional Tent 6 M x 12 M',
            category: 'Event Tent',
            description: 'Saudi Traditional Tent 6 M x 12 M.',
            basePrice: 4500,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Traditional Style', 'Large Capacity', '6x12 Meters'],
            displayPrice: true
        },
        {
            id: 's-ep-007',
            name: 'Event Tent',
            category: 'Event Tent',
            description: 'Standard Event Tent.',
            basePrice: 3500,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Standard Tent', 'Event Coverage'],
            displayPrice: true
        },
        {
            id: 's-ep-008',
            name: 'Disposable Cutlery/Plates/Napkins',
            category: 'Catering Supplies',
            description: 'Disposable Cutlery, Plates, and Napkins.',
            basePrice: 10,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Disposable', 'Complete Set'],
            displayPrice: true
        },
        {
            id: 's-ep-009',
            name: 'Chair Covers',
            category: 'Furniture Rental',
            description: 'Elegant Chair Covers.',
            basePrice: 12,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Elegant Design', 'Various Colors'],
            displayPrice: true
        },
        {
            id: 's-ep-010',
            name: 'Table Covers',
            category: 'Furniture Rental',
            description: 'Premium Table Covers.',
            basePrice: 12,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Premium Quality', 'Various Sizes'],
            displayPrice: true
        },
        {
            id: 's-ep-011',
            name: 'Table Covers (Games tables)',
            category: 'Furniture Rental',
            description: 'Table Covers specifically for Games tables.',
            basePrice: 15,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Games Table Fit', 'Durable Material'],
            displayPrice: true
        },
        {
            id: 's-ep-012',
            name: 'Dining Chairs Rental',
            category: 'Furniture Rental',
            description: 'Rental of Dining Chairs.',
            basePrice: 15,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Comfortable', 'Event Style'],
            displayPrice: true
        },
        {
            id: 's-ep-013',
            name: 'Dining Round Tables',
            category: 'Furniture Rental',
            description: 'Rental of Round Dining Tables.',
            basePrice: 90,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Round Shape', 'Dining Capacity'],
            displayPrice: true
        },
        {
            id: 's-ep-014',
            name: 'Service/Buffet Tables',
            category: 'Furniture Rental',
            description: 'Rental of Service or Buffet Tables.',
            basePrice: 90,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Rectangular/Round', 'Sturdy'],
            displayPrice: true
        },
        {
            id: 's-ep-015',
            name: 'Delivery, Setup & Dismantling Fee',
            category: 'Logistics',
            description: 'Comprehensive fee for delivery, setup, and dismantling of event equipment.',
            basePrice: 600,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Full Service', 'Logistics Handling'],
            displayPrice: true
        },
        {
            id: 's-ep-016',
            name: 'Coordination & Event Management Fee',
            category: 'Management',
            description: 'Fee for event coordination and management services.',
            basePrice: 350,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Professional Coordination', 'On-site Management'],
            displayPrice: true
        },
        {
            id: 's-ep-017',
            name: 'Service Staff (4 people, 8 hours)',
            category: 'Staffing',
            description: 'Team of 4 service staff members for an 8-hour shift.',
            basePrice: 350,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Professional Staff', '8 Hour Shift', 'Team of 4'],
            displayPrice: true
        },
        {
            id: 's-ep-018',
            name: 'VIP Travel Package Upgrade',
            category: 'Travel',
            description: 'Upgrade to VIP Travel Package.',
            basePrice: 350,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['VIP Status', 'Travel Upgrade'],
            displayPrice: true
        },
        // Carlton Al Moaibed Hotel Services
        {
            id: 's-ch-001',
            name: 'Lunch Buffet Option A',
            category: 'Catering',
            description: 'International Bread Selection, Cold Appetizers (Hummus, Vine Leaves, etc.), Salads (Tabbouleh, Rocca...), Hot Appetizers (Spinach Fatayer...), Main Courses (Baked Hamour, Butter Chicken...), Desserts (Cheesecake...), Beverages.',
            basePrice: 200,
            pricingType: 'Per Person',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['International Menu', 'Comprehensive Buffet'],
            menuOptions: ['Hummus Beiruty', 'Vine Leaves', 'Tabbouleh', 'Rocca Mushroom Salad', 'Spinach Fatayer', 'Baked Hamour Filet', 'Butter Chicken', 'Lamb Kabsa', 'Salted Caramel Cheesecake', 'Soft Drinks'],
            displayPrice: true
        },
        {
            id: 's-ch-002',
            name: 'Lunch Buffet Option B',
            category: 'Catering',
            description: 'Includes Bread Display, Hummus Tahini, Phoenician Labneh, Fattoush, Beetroot Carpaccio, Chicken Musakhan Rolls, Duo Roasted Hamour, Grilled Tenderloin, Pistachio Cheesecake, and more.',
            basePrice: 240,
            pricingType: 'Per Person',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Premium Selection', 'International & Oriental'],
            menuOptions: ['Hummus Tahini', 'Phoenician Labneh', 'Fattoush', 'Beetroot Carpaccio', 'Chicken Musakhan Rolls', 'Duo Roasted Hamour', 'Grilled Tenderloin', 'Pistachio Cheesecake'],
            displayPrice: true
        },
        {
            id: 's-ch-003',
            name: 'Lunch Buffet Option C',
            category: 'Catering',
            description: 'Includes Trio Hummus, Raheb Eggplant, Avocado Shrimp Salad, Goat Cheese Salad, Lobster Tail Gratin, Coconut Fish Curry, Roasted Lamb, Baked Mango Cheesecake, and more.',
            basePrice: 300,
            pricingType: 'Per Person',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Luxury Selection', 'Seafood & Lamb Specials'],
            menuOptions: ['Trio Hummus', 'Raheb Eggplant', 'Avocado Shrimp Salad', 'Lobster Tail Gratin', 'Coconut Fish Curry', 'Roasted Lamb', 'Baked Mango Cheesecake'],
            displayPrice: true
        },
        {
            id: 's-ch-004',
            name: 'Morning Breakfast VIP Menu',
            category: 'Catering',
            description: 'A premium breakfast buffet for VIPs including Bread display, Croissants, Rustic Bites, Mini manakish, Cold cuts, Hot Display, Pancakes, and Fresh Juices.',
            basePrice: 180,
            pricingType: 'Per Person',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['VIP Breakfast', 'Extensive Variety'],
            menuOptions: ['Bread Display', 'Croissants', 'Rustic Bites', 'Mini Manakish', 'Cold Cuts', 'Hot Display', 'Pancakes', 'Fresh Juices', 'Arabic Coffee'],
            displayPrice: true
        },
        {
            id: 's-ch-005',
            name: 'Refreshment',
            category: 'Catering',
            description: 'Standard refreshment package.',
            basePrice: 80,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Standard Refreshments'],
            displayPrice: true
        },
        {
            id: 's-ch-006',
            name: 'Lunch',
            category: 'Catering',
            description: 'Standard Lunch package.',
            basePrice: 200,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Standard Lunch'],
            displayPrice: true
        },
        {
            id: 's-ch-007',
            name: 'Transportation',
            category: 'Logistics',
            description: 'Transportation service.',
            basePrice: 300,
            pricingType: 'Per Unit',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Transportation'],
            displayPrice: true
        },
        {
            id: 's-ch-008',
            name: 'Lunch + Standard Coffee Break (Option A)',
            category: 'Catering Package',
            description: 'Combined package of Lunch Buffet Option A and Standard Coffee Break.',
            basePrice: 240,
            pricingType: 'Per Person',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Lunch Buffet A', 'Coffee Break'],
            displayPrice: true
        },
        {
            id: 's-ch-009',
            name: 'Lunch + Standard Coffee Break (Option B)',
            category: 'Catering Package',
            description: 'Combined package of Lunch Buffet Option B and Standard Coffee Break.',
            basePrice: 280,
            pricingType: 'Per Person',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Lunch Buffet B', 'Coffee Break'],
            displayPrice: true
        },
        {
            id: 's-ch-010',
            name: 'Lunch + Standard Coffee Break (Option C)',
            category: 'Catering Package',
            description: 'Combined package of Lunch Buffet Option C and Standard Coffee Break.',
            basePrice: 340,
            pricingType: 'Per Person',
            status: 'Active',
            createdAt: now,
            lastModifiedAt: now,
            keyFeatures: ['Lunch Buffet C', 'Coffee Break'],
            displayPrice: true
        }
      ];
      
      const currentServices = stateV12.services || [];
      const addedServices = newServices.filter(ns => !currentServices.some((cs: any) => cs.id === ns.id));

      if (addedServices.length === 0) {
          return stateV12;
      }

      return {
          ...stateV12,
          services: [...currentServices, ...addedServices]
      };
  }
};

/**
 * Runs all necessary migration functions sequentially to bring
 * the old state up to the current DATA_VERSION.
 */
export const runMigrations = (data: any, storedVersion: number) => {
  let migratedData = data;
  for (let v = storedVersion + 1; v <= DATA_VERSION; v++) {
    const migration = (migrations as any)[v];
    if (migration) {
      console.log(`Running migration to version ${v}...`);
      migratedData = migration(migratedData);
    }
  }
  return migratedData;
};
