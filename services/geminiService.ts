import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import type { ServiceItem, EventItem, User, Client, CostTrackerItem, ProcurementDocument, SubItem, ProposalLineItem } from '../types';

export class QuotaExceededError extends Error {
  retryAfter: number;
  isHardLimit: boolean;
  userAction?: string;

  constructor(message: string, retryAfter = 60, detailedMessage = '', isHardLimit = false, userAction = '') {
    super(message);
    this.name = 'QuotaExceededError';
    this.retryAfter = retryAfter;
    this.isHardLimit = isHardLimit;
    this.userAction = userAction;
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const safeGenerateContent = async (params: any): Promise<GenerateContentResponse> => {
    try {
        return await ai.models.generateContent(params);
    } catch (error: any) {
        if (error.status === 429 || error.code === 429) {
            throw new QuotaExceededError("API Quota Exceeded", 60, error.message);
        }
        throw error;
    }
}

const parseJSON = (text: string) => {
    try {
        // Aggressively clean markdown and potential noise
        const cleanText = text
            .replace(/```json\s*/g, '')
            .replace(/```\s*$/g, '')
            .replace(/```/g, '') // Catch stray backticks
            .trim();
        return JSON.parse(cleanText);
    } catch (e) {
        console.warn("Failed to parse JSON, returning raw text or empty object", text);
        // Attempt to salvage if it's a list wrapped in text
        const arrayMatch = text.match(/\[.*\]/s);
        if (arrayMatch) {
            try { return JSON.parse(arrayMatch[0]); } catch (e2) {}
        }
        const objectMatch = text.match(/\{.*\}/s);
        if (objectMatch) {
             try { return JSON.parse(objectMatch[0]); } catch (e3) {}
        }
        return {};
    }
}

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64 = result.split(',')[1];
        resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
};

// --- CORE SERVICES ---

export const getAIServiceAssistance = async (type: string, service: Partial<ServiceItem>, settings: any, uniqueCategories: string[]) => {
    let prompt = '';
    let responseMimeType = 'text/plain';

    switch (type) {
        case 'description':
            prompt = `Write a compelling marketing description for a service named "${service.name}"${service.category ? ` in the category "${service.category}"` : ''}. Keep it under 300 characters.`;
            break;
        case 'features':
            prompt = `List 3 key features or benefits for the service "${service.name}" (${service.description}). Return as JSON array of strings.`;
            responseMimeType = 'application/json';
            break;
        case 'menu_options':
            prompt = `Generate a list of 5-8 specific menu items, inclusions, or components for a service named "${service.name}" described as "${service.description}". Return as a JSON array of strings.`;
            responseMimeType = 'application/json';
            break;
        case 'price':
            prompt = `Suggest a base price number (no currency symbol) for "${service.name}" in Saudi Riyals (SAR). Market: High-end events. Return only the number.`;
            break;
        case 'tags':
            prompt = `Generate 5 relevant tags for "${service.name}"${service.description ? ` based on description: "${service.description}"` : ''}. Return as comma-separated string.`;
            break;
        case 'category':
             prompt = `Suggest the best category for "${service.name}" from this list: ${uniqueCategories.join(', ')}. If none fit, suggest a new short one. Return only the category name.`;
             break;
        case 'image_prompt':
             prompt = `Create a detailed image generation prompt for a high-quality, photorealistic image of the service "${service.name}" (${service.description}). The image should be suitable for a luxury event catalogue.`;
             break;
    }

    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: responseMimeType !== 'text/plain' ? { responseMimeType } : undefined
    });

    let result: any = response.text;
    if (responseMimeType === 'application/json') {
        result = parseJSON(result);
    }
    
    return { result, fullPrompt: prompt, source: 'ai' };
};

export const generateReportInsight = async (reportType: string, contextData: any) => {
    const prompt = `You are an executive analyst. Generate a brief, insightful ${reportType} based on the following data: ${JSON.stringify(contextData)}. Use HTML formatting (bold, lists) for readability. Highlight key trends and actionable advice.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    return { result: response.text || '', fullPrompt: prompt };
};

export const generateEventTheme = async (event: EventItem) => {
    const prompt = `Suggest a creative and cohesive theme for the event "${event.name}" (${event.eventType}) for client "${event.clientName}". 
    Return JSON with fields: title, description, imagePrompt (a prompt to generate a mood board image for this theme).`;
    
    const response = await safeGenerateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    const result = parseJSON(response.text || '{}');
    return { ...result, fullPrompt: prompt };
};

export const generateImageForPrompt = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, aspectRatio: '1:1', outputMimeType: 'image/jpeg' }
    });
    return response.generatedImages[0].image.imageBytes;
};

export const generateCustomImage = async (prompt: string, aspectRatio: string = '16:9'): Promise<string> => {
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: { numberOfImages: 1, aspectRatio: aspectRatio as any, outputMimeType: 'image/jpeg' }
    });
    return response.generatedImages[0].image.imageBytes;
};

export const analyzeImageContent = async (prompt: string, file: File): Promise<string> => {
    const base64Data = await fileToBase64(file);
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: base64Data } },
                { text: prompt }
            ]
        }
    });
    return response.text || '';
};

export const getFastSuggestions = async (event: EventItem) => {
    const prompt = `Give 3 quick, creative ideas for "${event.name}".`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return { result: response.text || '', fullPrompt: prompt };
};

export const generateEventIntroduction = async (event: EventItem, themeTitle: string, themeDescription: string) => {
    const prompt = `Write a professional proposal introduction for "${event.name}". Theme: "${themeTitle}" - ${themeDescription}. Client: ${event.clientName}.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return response.text || '';
};

export const generateEventConclusion = async (event: EventItem) => {
    const prompt = `Write a persuasive conclusion for an event proposal for "${event.name}".`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return response.text || '';
};

export const enhanceLineItem = async (item: CostTrackerItem, event: EventItem, type: 'description' | 'image_prompt' | 'pricing') => {
    let prompt = '';
    if (type === 'description') {
        prompt = `Enhance this line item description for a proposal: "${item.description || item.name}". Context: Event "${event.name}". Make it professional and appealing.`;
    } else if (type === 'image_prompt') {
        prompt = `Create an image generation prompt for this event item: "${item.name}".`;
    } else if (type === 'pricing') {
        prompt = `Suggest a client price (SAR) for "${item.name}" (Cost: ${item.unit_cost_sar}). Return only the numeric value.`;
    }

    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return { result: response.text || '', fullPrompt: prompt };
};

export const reviewProposalContent = async (fullText: string) => {
    const prompt = `Review this event proposal content and provide feedback on tone, clarity, and persuasiveness. Point out any missing key elements. Content: ${fullText}`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return { result: response.text || '', fullPrompt: prompt };
};

export const generateSubItemsForItem = async (item: ProposalLineItem, event: EventItem) => {
    const prompt = `List 3-5 sub-items or components included in "${item.name}" for an event. Return JSON array of objects with 'name' and 'description'.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return parseJSON(response.text || '[]');
};

export const generateSubItemsForService = async (service: ServiceItem) => {
    const prompt = `List typical sub-items/ingredients for service "${service.name}" (${service.category}). Return JSON array of objects with 'name' and 'description'.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return parseJSON(response.text || '[]');
};

export const generateSubItemDescription = async (name: string, parent: { name: string }, event: any) => {
    const prompt = `Describe the sub-item "${name}" which is part of "${parent.name}". Keep it brief (1 sentence).`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return response.text || '';
};

export const generateTermsAndConditions = async (event: EventItem) => {
    const prompt = `Generate standard terms and conditions for event "${event.name}". Include payment terms, cancellation policy, and liability.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt
    });
    return { result: response.text || '', fullPrompt: prompt };
};

export const analyzeEventRisks = async (events: EventItem[]) => {
    const prompt = `Analyze risks for these events: ${JSON.stringify(events.map(e => ({name: e.name, status: e.status, date: e.date})))}. Return JSON object where keys are eventIds and values are objects with { riskLevel: 'Low'|'Medium'|'High', riskFactors: string[], suggestedStatus: string }.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return { analysis: parseJSON(response.text || '{}'), fullPrompt: prompt };
};

export const analyzeMarketRate = async (itemName: string, location: string) => {
    const prompt = `What is the market rate range for renting/buying "${itemName}" in ${location} (in SAR)? Provide a range and brief reasoning.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { tools: [{ googleSearch: {} }] } // Using Search Grounding
    });
    
    let text = response.text || '';
    return { priceRange: text, reasoning: "Based on Google Search results.", fullPrompt: prompt };
};

export const createEventFromInput = async (input: { text: string, files: File[] }, services: ServiceItem[], useDeepThinking: boolean) => {
    const parts: any[] = [];
    if (input.text) parts.push({ text: input.text });
    
    for (const file of input.files) {
        const base64 = await fileToBase64(file);
        parts.push({ inlineData: { mimeType: file.type, data: base64 } });
    }

    const systemInstruction = `You are a "Forensic Event Planner & Data Analyst".
    Your mission is to extract event details and a precise Bill of Quantities (BOQ) from the provided documents with 100% accuracy.

    PHASE 1: EVENT METADATA FORENSICS
    - **Date Analysis**: 
      - Identify the *Document Date* first.
      - Calculate relative dates (e.g., "Next Friday") based on the Document Date.
      - Handle multi-day ranges (e.g., "Oct 12-14").
      - Output strictly in ISO format (YYYY-MM-DD). If range, use Start Date.
    - **Location Intelligence**:
      - Distinguish between the *Billing Address* (Office) and the *Event Venue* (Hotel, Hall, Site).
      - Prioritize the physical location where the event takes place.
    - **Stakeholder ID**:
      - "clientName": The Company/Organization paying.
      - "clientContact": The specific Human Name (Decision Maker/POC).

    PHASE 2: FINANCIAL CONTEXT & PRICING STRATEGY
    - Analyze the document type:
      - **Vendor Quote / Invoice**: These are COSTS. Map extracted prices to 'unit_cost_sar'. Set 'client_price_sar' to 0 (or mark up by 30% if unsure).
      - **Client RFQ / Budget / Proposal**: These are PRICES. Map extracted prices to 'client_price_sar'. Set 'unit_cost_sar' to 0.
    
    PHASE 3: LINE ITEM DEEP EXTRACTION
    - Scan for tables. Identify columns for: Description, Qty, Unit Price, Total.
    - **Bundles**: If a line item has nested bullets or sub-lines, combine them into the 'description'.
    - **Clean Data**: Remove currency symbols (SAR, $, USD), commas in numbers.
    - **Map to Services**: Try to match extracted items to the provided 'Master Services List' names if close.

    OUTPUT JSON SCHEMA:
    {
      "name": "Event Name (Inferred or Explicit)",
      "clientName": "Company Name",
      "clientContact": "Person Name",
      "date": "YYYY-MM-DD",
      "location": "Venue Name",
      "guestCount": number,
      "remarks": "Summary of requirements / Event Brief",
      "eventType": "Wedding" | "Corporate" | "Birthday" | "Social" | "Other",
      "cost_tracker": [
        {
          "name": "Item Name",
          "description": "Full Specs",
          "quantity": number,
          "unit_cost_sar": number,
          "client_price_sar": number
        }
      ]
    }`;

    parts.push({ text: `Extract event details. Master Services List for reference: ${JSON.stringify(services.map(s=>s.name))}` });

    const config: any = { 
        responseMimeType: "application/json",
        systemInstruction: systemInstruction
    };
    
    if (useDeepThinking) {
        config.thinkingConfig = { thinkingBudget: 16384 }; // Max budget for forensic analysis
    }

    const response = await safeGenerateContent({
        model: "gemini-2.5-pro", // Always use Pro for extraction
        contents: { parts },
        config
    });

    const eventData = parseJSON(response.text || '{}');
    return { eventData, interaction: { fullPrompt: 'Forensic Event Extraction', response: response.text, feature: 'event_creation', model: 'gemini-2.5-pro' } };
};

// --- ADVANCED EXTRACTION SERVICES ---

export const createServicesFromInput = async (input: { text: string, files: File[] }) => {
    const parts: any[] = [];
    if (input.text) parts.push({ text: input.text });
    
    for (const file of input.files) {
        const base64 = await fileToBase64(file);
        parts.push({ inlineData: { mimeType: file.type, data: base64 } });
    }
    
    const systemInstruction = `You are an expert Procurement and Pricing Analyst. 
    Your task is to extract service catalogs from documents (menus, invoices, price lists) with 100% accuracy.
    
    CRITICAL PRICING LOGIC:
    1. **ElitePro Detection**: Scan for "ElitePro" or "Elite Pro" branding.
       - IF DETECTED: All prices are **Selling Prices** (map to 'basePrice'). Set 'pricingStrategy' = 'ElitePro_Client_Rate'.
       - IF NOT DETECTED: Assume standard **Cost** prices. Set 'pricingStrategy' = 'Standard_Base_Rate'.
    
    EXTRACTION RULES:
    - **Tables**: Identify columns for Item Name, Description, and Price.
    - **Multi-line**: Reconstruct descriptions that span multiple lines.
    - **Categorization**: Auto-categorize (e.g., 'Catering', 'AV', 'Decor').
    
    OUTPUT FORMAT (JSON):
    {
      "metadata": { "detectedBranding": string, "pricingStrategy": string },
      "services": [ { "name": string, "description": string, "category": string, "basePrice": number, "pricingType": string, "confidenceScore": number (0-100) } ]
    }`;

    parts.push({ text: "Extract all services found in the document." });

    const response = await safeGenerateContent({
        model: "gemini-2.5-pro",
        contents: { parts },
        config: { 
            responseMimeType: "application/json",
            systemInstruction: systemInstruction,
            thinkingConfig: { thinkingBudget: 8192 } // High budget for deep analysis
        }
    });

    const result = parseJSON(response.text || '{}');
    const services = Array.isArray(result) ? result : (result.services || []);
    const metadata = result.metadata || { detectedBranding: 'Unknown', pricingStrategy: 'Standard' };

    return { services, metadata, interaction: { fullPrompt: 'Bulk Service Extraction', response: response.text, feature: 'bulk_service_creation', model: 'gemini-2.5-pro' } };
};

export const extractEventItemsFromInput = async (input: { text: string, files: File[] }, useDeepThinking: boolean) => {
    const parts: any[] = [];
    if (input.text) parts.push({ text: input.text });
    for (const file of input.files) {
        const base64 = await fileToBase64(file);
        parts.push({ inlineData: { mimeType: file.type, data: base64 } });
    }

    const systemInstruction = `You are a Forensic Accountant and Senior Event Planner.
    Your task is to extract a precise Bill of Quantities (BOQ) from the provided documents.
    
    FORENSIC RULES:
    1.  **Accuracy First**: Extract ONLY visible items. Do not hallucinate.
    2.  **Price Logic**: 
        - If document is a **Supplier Quote**, prices are 'unit_cost_sar'.
        - If document is a **Client Proposal**, prices are 'client_price_sar'.
        - **ElitePro Override**: If "ElitePro" branding exists, ALWAYS map to 'client_price_sar'.
    3.  **Structure**: Handle complex tables (nested headers, sub-totals).
    4.  **Bundles**: If an item says "Includes: A, B, C", put that in the 'description' of the main item.
    
    OUTPUT SCHEMA (JSON Array):
    [ { "name": string, "description": string, "quantity": number, "unit_cost_sar": number, "client_price_sar": number, "category": string } ]`;

    parts.push({ text: "Perform a deep extraction of all line items." });

    // Force high-power model for extraction
    const response = await safeGenerateContent({
        model: "gemini-2.5-pro",
        contents: { parts },
        config: { 
            responseMimeType: "application/json",
            systemInstruction: systemInstruction,
            thinkingConfig: { thinkingBudget: 4096 }
        }
    });

    let items = parseJSON(response.text || '[]');
    
    // Robustness check: Ensure items is an array
    if (!Array.isArray(items)) {
        // Attempt to extract array from common keys if AI wrapped the response
        const possibleKeys = ['items', 'lineItems', 'services', 'cost_tracker', 'products', 'data'];
        for (const key of possibleKeys) {
            if (items && Array.isArray(items[key])) {
                items = items[key];
                break;
            }
        }
        
        // If still not an array, check if it's a single item object
        if (!Array.isArray(items) && items && typeof items === 'object' && (items.name || items.description)) {
            items = [items];
        } else if (!Array.isArray(items)) {
            // Fallback to empty array if extraction failed totally
            items = []; 
        }
    }

    return { items: items, interaction: { fullPrompt: 'Deep Item Extraction', response: response.text, feature: 'item_extraction', model: 'gemini-2.5-pro' } };
};

export const analyzeProcurementDocument = async (file: File, type: string, poContext?: any) => {
    const base64 = await fileToBase64(file);
    const systemInstruction = `You are a Senior Financial Controller.
    Analyze this ${type} with extreme attention to detail for reconciliation.
    
    TASKS:
    1. **Header Data**: Extract Supplier Name, Doc #, Date, Total.
    2. **Line Items**: Extract every line with Description, Qty, Unit Price, Total.
    3. **Reconciliation**:
       - Compare against PO Context (if provided).
       - Status: 'FULL_MATCH' (Exact), 'MINOR_VARIANCE' (<5% diff), 'MAJOR_DISCREPANCY' (>5% or missing).
    
    OUTPUT JSON:
    { 
        "extraction_status": "SUCCESS" | "PARTIAL" | "FAILED",
        "extracted_details": { "supplier_name": string, "document_number": string, "document_date": string, "total_amount": number, "line_items": [{ "description": string, "quantity": number, "unit_price": number, "total": number }] },
        "reconciliation_match": { "match_status": string, "total_variance_amount": number, "variance_reason": string, "related_po_number": string }
    }`;

    const prompt = `Analyze this ${type}. ${poContext ? `Compare against PO Context: ${JSON.stringify(poContext)}` : ''}`;

    const response = await safeGenerateContent({
        model: "gemini-2.5-pro",
        contents: {
            parts: [
                { inlineData: { mimeType: file.type, data: base64 } },
                { text: prompt }
            ]
        },
        config: { 
            responseMimeType: "application/json",
            systemInstruction: systemInstruction,
            thinkingConfig: { thinkingBudget: 4096 }
        }
    });

    return { analysis: parseJSON(response.text || '{}'), fullPrompt: prompt };
};

export const getServiceSuggestions = async (event: EventItem) => {
    const prompt = `Suggest 5 creative services or items to add to the event "${event.name}" (${event.eventType}). Return JSON array of objects with 'service' and 'description'.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return { suggestions: parseJSON(response.text || '[]'), fullPrompt: prompt };
};

export const generateVideoPreview = async (prompt: string): Promise<string> => {
    let operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: { numberOfVideos: 1, resolution: '1080p', aspectRatio: '16:9' }
    });
    
    while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await ai.operations.getVideosOperation({ operation: operation });
    }

    const videoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
    if (!videoUri) throw new Error("Failed to generate video.");

    return `${videoUri}&key=${process.env.API_KEY}`;
};

export const autofillClientDetails = async (companyName: string, website?: string) => {
    const prompt = `Find details for company "${companyName}" ${website ? `(${website})` : ''}. 
    Return JSON: { primaryContactName: string, email: string, phone: string, address: string, internalNotes: string (summary) }.
    Use dummy data if not real.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return parseJSON(response.text || '{}');
};

export const checkForDuplicateClient = async (newClient: Partial<Client>, existingClients: Client[]) => {
    const prompt = `Check if "${newClient.companyName}" matches any of these clients: ${JSON.stringify(existingClients.map(c => ({id: c.id, name: c.companyName})))}. 
    Return JSON: { isDuplicate: boolean, matchId: string | null }.`;
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    const result = parseJSON(response.text || '{}');
    if (result.isDuplicate && result.matchId) {
        return existingClients.find(c => c.id === result.matchId) || null;
    }
    return null;
};

export const curateServiceCollection = async (promptText: string, services: ServiceItem[]) => {
    const prompt = `Select best services from this list for: "${promptText}".
    Services: ${JSON.stringify(services.map(s => ({id: s.id, name: s.name, category: s.category})))}.
    Return JSON array of service IDs only.`;
    
    const response = await safeGenerateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return { serviceIds: parseJSON(response.text || '[]'), fullPrompt: prompt };
};

export const generateCatalogueConfig = async (serviceIds: string[], services: ServiceItem[]) => {
    const selected = services.filter(s => serviceIds.includes(s.id));
    const prompt = `Generate a catchy title and intro text for a catalogue containing these services: ${selected.map(s => s.name).join(', ')}. 
    Return JSON: { title: string, intro: string }.`;

    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return { ...parseJSON(response.text || '{}'), fullPrompt: prompt };
};

export const getFinancialAnalysis = async (events: EventItem[], services: ServiceItem[], users: User[]) => {
    const prompt = `Analyze the financial performance of these events. Highlight trends, profitable services, and salesperson performance.
    Events Summary: ${JSON.stringify(events.map(e => ({ name: e.name, revenue: e.cost_tracker.reduce((s, i) => s + i.client_price_sar * i.quantity, 0), status: e.status })))}.`;
    
    const response = await safeGenerateContent({
        model: "gemini-2.5-pro",
        contents: prompt
    });
    return { result: response.text || '', fullPrompt: prompt };
};

export const getPricingSuggestion = async (service: ServiceItem, events: EventItem[]) => {
    const prompt = `Suggest an optimal price for "${service.name}" based on its category "${service.category}" and base price ${service.basePrice}. 
    Consider it's used in high-end events. Return JSON: { suggestedPrice: number, suggestedMargin: number }.`;
    
    const response = await safeGenerateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { responseMimeType: "application/json" }
    });
    return { result: parseJSON(response.text || '{}'), fullPrompt: prompt };
};