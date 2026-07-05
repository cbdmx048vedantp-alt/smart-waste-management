import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  getDocs, 
  doc, 
  updateDoc, 
  getDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit
} from 'firebase/firestore';

// Types
interface User {
  uid: string;
  name: string;
  email: string;
  role: 'citizen' | 'admin';
  points: number;
  avatar?: string;
  createdAt: string;
}

interface Complaint {
  id: string;
  citizenId: string;
  citizenName: string;
  imageUrl: string;
  description: string;
  wasteType: string;
  confidence: number;
  severity: number;
  priority: 'Low' | 'Medium' | 'High';
  cleanlinessRating: string;
  environmentalImpact: string;
  recommendation: string;
  lat: number;
  lng: number;
  address: string;
  status: 'pending' | 'assigned' | 'resolved';
  assignedTo?: string;
  createdAt: string;
  updatedAt: string;
  qrCode?: string;
  comments?: any[];
}

interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

interface Crew {
  name: string;
  lat: number;
  lng: number;
  status: 'idle' | 'on_route' | 'active_cleaning';
  assignedComplaintId?: string;
  updatedAt: string;
}

// In-Memory Fallback Store (Pre-seeded with mock data)
const initialMockUsers: User[] = [
  {
    uid: 'citizen-uid-445',
    email: 'citizen@smartcity.org',
    name: 'Citizen',
    role: 'citizen',
    points: 120, // 100 starting gift + 20 points for 1 complaint report
    createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
  },
  {
    uid: 'citizen-uid-101',
    email: 'aisha@smartcity.org',
    name: 'Aisha Sharma',
    role: 'citizen',
    points: 280,
    createdAt: new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString()
  },
  {
    uid: 'citizen-uid-102',
    email: 'vedant@smartcity.org',
    name: 'Vedant Patel',
    role: 'citizen',
    points: 150,
    createdAt: new Date(Date.now() - 5 * 24 * 3600 * 1000).toISOString()
  },
  {
    uid: 'citizen-uid-103',
    email: 'elena@smartcity.org',
    name: 'Elena Rostova',
    role: 'citizen',
    points: 210,
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  }
];

const initialMockComplaints: Complaint[] = [
  {
    id: 'c_1',
    citizenId: 'citizen-uid-445',
    citizenName: 'Citizen',
    imageUrl: 'https://images.unsplash.com/photo-1611284446314-60a58ac0deb9?auto=format&fit=crop&q=80&w=600',
    description: 'A large, hazardous organic garbage heap blocking the primary entrance of the local park. Emits strong odor and attracts flies.',
    wasteType: 'Organic',
    confidence: 94,
    severity: 8,
    priority: 'High',
    cleanlinessRating: 'Very Poor',
    environmentalImpact: 'Significant hazard due to decomposition, pest attraction, and organic leachate risk.',
    recommendation: 'Immediate municipal dispatch of composting transfer trucks.',
    lat: 19.0760,
    lng: 72.8777,
    address: 'Sion Bandra Link Rd, Mumbai, Maharashtra 400017',
    status: 'assigned',
    assignedTo: 'Green Clean Squad',
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString(),
    qrCode: 'QR_COMPLAINT_C1',
    comments: [
      {
        id: 'comm_1',
        authorName: 'EcoBot AI',
        authorRole: 'bot',
        text: 'Litter category: Organic. High pathogen risk. Forwarding to the nearest compost recycling facility.',
        createdAt: new Date(Date.now() - 23 * 3600 * 1000).toISOString()
      },
      {
        id: 'comm_2',
        authorName: 'Municipal Dispatch',
        authorRole: 'admin',
        text: 'Assigned Green Clean Squad to resolve the issue.',
        createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: 'c_2',
    citizenId: 'citizen-uid-101',
    imageUrl: 'https://images.unsplash.com/photo-1530587191325-3db32d826c18?auto=format&fit=crop&q=80&w=600',
    citizenName: 'Aisha Sharma',
    description: 'A pile of non-biodegradable plastics and cardboard boxes accumulated at the roadside canal.',
    wasteType: 'Plastic',
    confidence: 89,
    severity: 6,
    priority: 'Medium',
    cleanlinessRating: 'Poor',
    environmentalImpact: 'Non-biodegradable pile blocking rain gutters. High risk of local water clogging.',
    recommendation: 'Dispatch standard dry waste collection loaders.',
    lat: 19.0820,
    lng: 72.8810,
    address: 'LBS Marg, Kurla West, Mumbai, Maharashtra 400070',
    status: 'resolved',
    assignedTo: 'Eco-Cleaners',
    createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    qrCode: 'QR_COMPLAINT_C2',
    comments: [
      {
        id: 'comm_3',
        authorName: 'Eco-Cleaners Crew',
        authorRole: 'crew',
        text: 'Site successfully cleared! 120kg of recyclable plastic routed to sorting center.',
        createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString()
      }
    ]
  },
  {
    id: 'c_3',
    citizenId: 'citizen-uid-102',
    imageUrl: 'https://images.unsplash.com/photo-1516996087931-5ae40155308e?auto=format&fit=crop&q=80&w=600',
    citizenName: 'Vedant Patel',
    description: 'Debris, cement blocks, and discarded steel rods left behind on the sidewalk near the under-construction office block.',
    wasteType: 'Construction',
    confidence: 96,
    severity: 5,
    priority: 'Medium',
    cleanlinessRating: 'Moderate',
    environmentalImpact: 'Sidewalk blockage causing pedestrian safety risks, physical obstruction.',
    recommendation: 'Sidewalk clearance needed. Notify constructing builder to clear public walkway.',
    lat: 19.0680,
    lng: 72.8720,
    address: 'BKC Road, G Block, Mumbai, Maharashtra 400051',
    status: 'pending',
    createdAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 3600 * 1000).toISOString(),
    qrCode: 'QR_COMPLAINT_C3',
    comments: []
  }
];

const initialMockCrews: Crew[] = [
  {
    name: 'Green Clean Squad',
    lat: 19.0750,
    lng: 72.8750,
    status: 'on_route',
    assignedComplaintId: 'c_1',
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Eco-Cleaners',
    lat: 19.0810,
    lng: 72.8800,
    status: 'idle',
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Oceanic Rescue',
    lat: 19.0550,
    lng: 72.8300,
    status: 'idle',
    updatedAt: new Date().toISOString()
  },
  {
    name: 'Civic Sweep division',
    lat: 19.1100,
    lng: 72.9000,
    status: 'idle',
    updatedAt: new Date().toISOString()
  }
];

const initialMockNotifications: Notification[] = [
  {
    id: 'notif_1',
    userId: 'citizen-uid-445',
    title: 'Report Registered! +20 XP',
    message: 'Your report regarding organic waste has been cataloged. Earned +20 points!',
    read: false,
    createdAt: new Date(Date.now() - 1 * 24 * 3600 * 1000).toISOString()
  },
  {
    id: 'notif_2',
    userId: 'citizen-uid-445',
    title: 'Squad Assigned',
    message: 'Green Clean Squad is on route to clean up the organic waste reported by you.',
    read: false,
    createdAt: new Date(Date.now() - 12 * 3600 * 1000).toISOString()
  }
];

let mockUsers: User[] = [];
let mockComplaints: Complaint[] = [];
let mockNotifications: Notification[] = [];
let mockCrews: Crew[] = [];

// Initialize Firebase
let firebaseApp: any = null;
let db: any = null;
let isFirebaseEnabled = false;

try {
  const firebaseConfigPath = path.join(process.cwd(), 'firebase-applet-config.json');
  if (fs.existsSync(firebaseConfigPath)) {
    const configData = JSON.parse(fs.readFileSync(firebaseConfigPath, 'utf-8'));
    if (configData.apiKey && configData.projectId) {
      if (getApps().length === 0) {
        firebaseApp = initializeApp(configData);
      } else {
        firebaseApp = getApp();
      }
      if (configData.firestoreDatabaseId) {
        db = getFirestore(firebaseApp, configData.firestoreDatabaseId);
      } else {
        db = getFirestore(firebaseApp);
      }
      isFirebaseEnabled = true;
      console.log('Firebase successfully initialized on Server side for Project:', configData.projectId);
    }
  }
} catch (error) {
  console.warn('Firebase server-side init skipped or failed, using in-memory store instead:', error);
}

// Initialize Gemini API
let ai: GoogleGenAI | null = null;
if (process.env.GEMINI_API_KEY) {
  ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  console.log('Gemini API initialized on server side.');
} else {
  console.warn('GEMINI_API_KEY is not defined. AI Analysis will operate in simulation mode.');
}

async function seedDatabaseIfNeeded() {
  console.log('Database auto-seeding has been disabled.');
}

async function startServer() {
  // Seed database/memory stores if needed
  await seedDatabaseIfNeeded();

  const app = express();
  const PORT = 3000;

  // JSON Body Parser for large base64 strings
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', firebase: isFirebaseEnabled, gemini: !!process.env.GEMINI_API_KEY });
  });

  // 1. Analyze Waste Image using Gemini Vision
  app.post('/api/analyze-waste', async (req, res) => {
    const { imageBase64, locationPrompt } = req.body;
    if (!imageBase64) {
      return res.status(400).json({ error: 'imageBase64 field is required' });
    }

    try {
      // Strip base64 metadata header if present
      let cleanedBase64 = imageBase64;
      let mimeType = 'image/jpeg';
      if (imageBase64.includes(';base64,')) {
        const parts = imageBase64.split(';base64,');
        mimeType = parts[0].replace('data:', '');
        cleanedBase64 = parts[1];
      }

      if (ai) {
        const prompt = `Analyze this image of a public or urban space. Your goals are:
1. Verify if the image contains litter, garbage, overflowing bin, waste dumping, debris, or any form of pollution/trash. If the image is unrelated to waste or clean-up (e.g., just a clean street, a normal house, or an unrelated object), return "isGarbage": false.
2. If yes, classify the primary waste type into one of these strict categories: Plastic, Organic, Metal, Paper, Glass, Mixed Waste, E-Waste.
3. Assess the Severity Score on a scale from 1 to 10 (where 10 is massive industrial dumping or high immediate biohazard/school blocks, and 1 is tiny wrapping).
4. Provide a Cleanliness Rating word (e.g., "Very Poor", "Poor", "Moderate", "Unclean").
5. Suggest a Priority ("Low", "Medium", "High").
6. Summarize the immediate Environmental Impact in a short scannable sentence.
7. Give a short action-oriented recommendation for municipal cleanup teams (e.g., what type of vehicle/sorting/hazard precautions to take, and urgency).
8. Deduce, estimate, or assign a plausible location/address and coordinates (latitude and longitude) in India based on any visual clues in the image (like Indian language signs, store names, vegetation, soil type, style of road, license plates, or architectural design). If no specific clues are present, default to a realistic street location in Mumbai, India (with coordinates around Latitude 19.0760, Longitude 72.8777, or variation matching a real location). Do NOT default to San Francisco or any US coordinates under any circumstances.

${locationPrompt ? `CRITICAL LOCATION REQUIREMENT: ${locationPrompt}` : ''}

Return your response strictly as a JSON object with this exact schema:
{
  "isGarbage": boolean,
  "wasteType": string,
  "confidence": number (an integer percentage, e.g. 95),
  "severity": number (1 to 10),
  "cleanlinessRating": string,
  "priority": "Low" | "Medium" | "High",
  "environmentalImpact": string,
  "recommendation": string,
  "address": string (a specific street address in India, e.g., "Sion Bandra Link Rd, Mumbai, Maharashtra 400017" or similar),
  "latitude": number (realistic lat coordinate in India, e.g. 19.0760),
  "longitude": number (realistic lng coordinate in India, e.g. 72.8777)
}
Do not return any extra markdown styling, prefix, or backticks besides raw JSON.`;

        try {
          const result = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
              {
                inlineData: {
                  mimeType: mimeType,
                  data: cleanedBase64
                }
              },
              prompt
            ],
            config: {
              responseMimeType: 'application/json'
            }
          });

          const responseText = result.text;
          if (responseText) {
            const parsed = JSON.parse(responseText.trim());

            // Validate and sanitize parsed location to ensure it is in India and not SF
            const INDIAN_LAT_MIN = 8.0;
            const INDIAN_LAT_MAX = 37.6;
            const INDIAN_LNG_MIN = 68.7;
            const INDIAN_LNG_MAX = 97.3;

            const FALLBACK_INDIAN_LOCATIONS = [
              { lat: 19.0760, lng: 72.8777, address: 'Mumbai, Maharashtra, India' },
              { lat: 28.6139, lng: 77.2090, address: 'New Delhi, Delhi, India' },
              { lat: 12.9716, lng: 77.5946, address: 'Bengaluru, Karnataka, India' },
              { lat: 13.0827, lng: 80.2707, address: 'Chennai, Tamil Nadu, India' },
              { lat: 22.5726, lng: 88.3639, address: 'Kolkata, West Bengal, India' },
              { lat: 17.3850, lng: 78.4867, address: 'Hyderabad, Telangana, India' },
              { lat: 23.0225, lng: 72.5714, address: 'Ahmedabad, Gujarat, India' },
              { lat: 26.9124, lng: 75.7873, address: 'Jaipur, Rajasthan, India' }
            ];

            let lat = parseFloat(parsed.latitude || parsed.lat);
            let lng = parseFloat(parsed.longitude || parsed.lng);

            const isValidLat = !isNaN(lat);
            const isValidLng = !isNaN(lng);

            const isWithinIndia = isValidLat && isValidLng && 
              lat >= INDIAN_LAT_MIN && lat <= INDIAN_LAT_MAX && 
              lng >= INDIAN_LNG_MIN && lng <= INDIAN_LNG_MAX;

            const isSanFrancisco = isValidLat && isValidLng &&
              Math.abs(lat - 37.7749) < 0.5 && Math.abs(lng - (-122.4194)) < 0.5;

            if (!isWithinIndia || isSanFrancisco) {
              const fallback = FALLBACK_INDIAN_LOCATIONS[Math.floor(Math.random() * FALLBACK_INDIAN_LOCATIONS.length)];
              parsed.latitude = fallback.lat;
              parsed.longitude = fallback.lng;
              parsed.lat = fallback.lat;
              parsed.lng = fallback.lng;
              parsed.address = parsed.address || fallback.address;
              if (parsed.address && (parsed.address.includes('San Francisco') || parsed.address.includes('USA') || parsed.address.includes('CA '))) {
                parsed.address = fallback.address;
              }
            } else {
              // Ensure fields are standardized for both schemas
              parsed.lat = lat;
              parsed.lng = lng;
              parsed.latitude = lat;
              parsed.longitude = lng;
            }

            return res.json(parsed);
          } else {
            throw new Error('Empty response from Gemini');
          }
        } catch (innerError: any) {
          console.error('Gemini call error:', innerError);
          return res.status(500).json({ error: 'AI analysis failed: ' + innerError.message });
        }
      } else {
        // Simulated Gemini API responses for demo/fallback
        console.log('Simulating Gemini analysis...');
        const mockWasteTypes = ['Plastic', 'Organic', 'E-Waste', 'Glass', 'Metal', 'Paper', 'Mixed Waste'];
        const randomType = mockWasteTypes[Math.floor(Math.random() * mockWasteTypes.length)];
        const severity = Math.floor(Math.random() * 8) + 3; // 3 to 10
        const priority = severity >= 8 ? 'High' : (severity >= 5 ? 'Medium' : 'Low');
        
        const mumbaiAddresses = [
          'Sion Bandra Link Rd, Mumbai, Maharashtra 400017',
          'LBS Marg, Kurla West, Mumbai, Maharashtra 400070',
          'BKC Road, G Block, Mumbai, Maharashtra 400051',
          'Dharavi Main Rd, Dharavi, Mumbai, Maharashtra 400017',
          'Senapati Bapat Marg, Dadar West, Mumbai, Maharashtra 400028'
        ];
        const randomAddr = mumbaiAddresses[Math.floor(Math.random() * mumbaiAddresses.length)];
        const latOffset = (Math.random() - 0.5) * 0.04;
        const lngOffset = (Math.random() - 0.5) * 0.04;

        const simulationResult = {
          isGarbage: true,
          wasteType: randomType,
          confidence: Math.floor(Math.random() * 15) + 82, // 82% to 97%
          severity: severity,
          cleanlinessRating: severity >= 8 ? 'Very Poor' : 'Moderate',
          priority: priority,
          environmentalImpact: `Accumulation of ${randomType.toLowerCase()} poses immediate clogging risks for civic sewer grates and ecosystem pollution.`,
          recommendation: `Dispatch ${randomType === 'E-Waste' ? 'certified e-recyclers' : 'standard sanitation staff'} with proper safety gear. Sort materials at source.`,
          address: randomAddr,
          latitude: 19.0760 + latOffset,
          longitude: 72.8777 + lngOffset
        };

        // Delay to simulate real AI processing
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json(simulationResult);
      }
    } catch (e: any) {
      console.error('Outer image analysis error:', e);
      res.status(500).json({ error: 'Server error processing waste analysis: ' + e.message });
    }
  });

  // 2. Chatbot Assistant API
  app.post('/api/chat', async (req, res) => {
    const { message, history } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message parameter is required' });
    }

    try {
      if (ai) {
        const sysInstruction = `You are EcoBot, the Intelligent Waste Management Companion for Sustainable Cities (SDG 11).
Your role is to help citizens and admin users with waste sorting, eco-friendly habits, sustainable civic practices, and using the Smart Waste Management App.
App usage hints:
- Citizens can report waste by snapping/uploading photos. Gemini AI automatically categorizes it and assesses severity.
- Reward points are earned (50 pts per resolved report) which helps users climb the civic leaderboard!
- Admins can assign cleaning crews, tracking complaints in real-time.
Provide professional, informative, short (max 3-4 sentences), and friendly guidance on recycling, composting, garbage reduction, and city policies. Support multiple languages if queried. Use formatting like bullet points or bold text to make it readable.`;

        const chatContents = [
          { text: sysInstruction }
        ];

        if (Array.isArray(history)) {
          history.forEach(item => {
            chatContents.push({ text: `${item.role === 'user' ? 'Citizen' : 'EcoBot'}: ${item.content}` });
          });
        }
        chatContents.push({ text: `Citizen: ${message}` });

        const result = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: chatContents
        });

        return res.json({ reply: result.text || 'I am ready to assist you with municipal waste questions!' });
      } else {
        // Simulated chatbot responses
        const replies = [
          `To report overflowing trash, click the "Report Waste" button, take or upload a photo, let the AI categorize the material, and submit. Our city response team will be assigned instantly!`,
          `Great question! Sorting materials properly is vital. Plastics go in the blue bins, compostable food scrap in green organic containers, and hazardous electronic scrap must be brought to designated centers or reported on our app.`,
          `By keeping our communities clean (SDG 11), we prevent toxic materials from polluting our water table and save thousands in public sanitation costs. Every report earns you 50 civic merit points!`,
          `Welcome to Smart Waste Management! As a Citizen, you can log trash reports, track your history, and earn eco-points. As an Admin, you can assign cleaners and manage real-time heatmaps.`
        ];
        const selected = replies[Math.floor(Math.random() * replies.length)];
        return res.json({ reply: `[Simulation] ${selected}` });
      }
    } catch (err: any) {
      console.error('Chat bot error:', err);
      res.status(500).json({ error: 'EcoBot failed to respond: ' + err.message });
    }
  });

  // 3. User Login/Register / Firestore integration
  app.post('/api/users/sync', async (req, res) => {
    const { uid, email, name, role } = req.body;
    if (!uid || !email) {
      return res.status(400).json({ error: 'uid and email are required' });
    }

    try {
      let matchedUser: User | null = null;

      if (isFirebaseEnabled) {
        const userDocRef = doc(db, 'users', uid);
        const userSnap = await getDoc(userDocRef);
        
        if (userSnap.exists()) {
          matchedUser = userSnap.data() as User;
        } else {
          matchedUser = {
            uid,
            email,
            name: name || email.split('@')[0],
            role: role || (email.includes('admin') ? 'admin' : 'citizen'),
            points: 100, // starting gift
            createdAt: new Date().toISOString()
          };
          const { setDoc } = await import('firebase/firestore');
          await setDoc(userDocRef, matchedUser);
        }
      } else {
        const existing = mockUsers.find(u => u.uid === uid || u.email === email);
        if (existing) {
          matchedUser = existing;
        } else {
          matchedUser = {
            uid,
            email,
            name: name || email.split('@')[0],
            role: role || (email.includes('admin') ? 'admin' : 'citizen'),
            points: 100,
            createdAt: new Date().toISOString()
          };
          mockUsers.push(matchedUser);
        }
      }

      res.json(matchedUser);
    } catch (e: any) {
      console.error('Sync user error:', e);
      res.status(500).json({ error: e.message, stack: e.stack });
    }
  });

  // 4. Create Complaint
  app.post('/api/complaints', async (req, res) => {
    const { 
      citizenId, 
      citizenName, 
      imageUrl, 
      description, 
      wasteType, 
      confidence, 
      severity, 
      priority, 
      cleanlinessRating, 
      environmentalImpact, 
      recommendation, 
      lat, 
      lng, 
      address 
    } = req.body;

    if (!citizenId || !imageUrl || !wasteType) {
      return res.status(400).json({ error: 'Missing required complaint parameters' });
    }

    const newComplaint: Complaint = {
      id: 'c_' + Math.random().toString(36).substr(2, 9),
      citizenId,
      citizenName: citizenName || 'Anonymous Citizen',
      imageUrl,
      description: description || 'No extra descriptions provided.',
      wasteType,
      confidence: confidence || 90,
      severity: severity || 5,
      priority: priority || 'Medium',
      cleanlinessRating: cleanlinessRating || 'Moderate',
      environmentalImpact: environmentalImpact || 'General urban landfill burden.',
      recommendation: recommendation || 'Schedule routine garbage collector dispatch.',
      lat: lat || 19.0760,
      lng: lng || 72.8777,
      address: address || 'Mumbai, India',
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      qrCode: 'QR_COMPLAINT_' + Math.random().toString(36).substr(2, 5),
      comments: []
    };

    try {
      if (isFirebaseEnabled) {
        const complaintsCol = collection(db, 'complaints');
        await addDoc(complaintsCol, newComplaint);

        // Add 20 points to citizen for reporting!
        const userDocRef = doc(db, 'users', citizenId);
        const userSnap = await getDoc(userDocRef);
        if (userSnap.exists()) {
          const currentPoints = userSnap.data().points || 0;
          const { setDoc } = await import('firebase/firestore'); await setDoc(userDocRef, { points: currentPoints + 20 }, { merge: true });
        }

        // Add a notification
        const notificationsCol = collection(db, 'notifications');
        await addDoc(notificationsCol, {
          userId: citizenId,
          title: 'Report Submitted! +20 XP',
          message: `Your report regarding ${wasteType.toLowerCase()} has been cataloged. Earned +20 points!`,
          read: false,
          createdAt: new Date().toISOString()
        });
      } else {
        mockComplaints.unshift(newComplaint);
        
        // Update mock points
        const userIdx = mockUsers.findIndex(u => u.uid === citizenId);
        if (userIdx !== -1) {
          mockUsers[userIdx].points += 20;
        }

        // Add mock notification
        mockNotifications.unshift({
          id: 'n_' + Math.random().toString(36).substr(2, 5),
          userId: citizenId,
          title: 'Report Submitted! +20 XP',
          message: `Your report regarding ${wasteType.toLowerCase()} has been cataloged. Earned +20 points!`,
          read: false,
          createdAt: new Date().toISOString()
        });
      }

      res.status(201).json(newComplaint);
    } catch (e: any) {
      console.error('Create complaint error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 5. Get Complaints
  app.get('/api/complaints', async (req, res) => {
    try {
      let complaintsList: Complaint[] = [];

      if (isFirebaseEnabled) {
        const complaintsCol = collection(db, 'complaints');
        const q = query(complaintsCol, orderBy('createdAt', 'desc'));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {} else {
          querySnapshot.forEach((docSnap) => {
            const data = docSnap.data() as Complaint;
            complaintsList.push({ ...data, id: docSnap.id }); // Use firestore ID
          });
        }
      } else {
        complaintsList = [...mockComplaints];
      }

      // Quick filtering in-server if query is present
      const { status, wasteType } = req.query;
      if (status) {
        complaintsList = complaintsList.filter(c => c.status === status);
      }
      if (wasteType) {
        complaintsList = complaintsList.filter(c => c.wasteType === wasteType);
      }

      res.json(complaintsList);
    } catch (e: any) {
      console.error('Fetch complaints error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 6. Patch Complaint (Assign, Resolve, Add Comment)
  app.patch('/api/complaints/:id', async (req, res) => {
    const { id } = req.params;
    const { status, assignedTo, comment, userId, userName, userRole } = req.body;

    try {
      let foundComplaint: Complaint | null = null;

      if (isFirebaseEnabled) {
        // Find doc in Firestore
        // Note: In Firestore, the id is usually the document ID. Let's find by field 'id' or search
        const complaintsCol = collection(db, 'complaints');
        const q = query(complaintsCol, where('id', '==', id));
        const querySnapshot = await getDocs(q);
        
        let docId = '';
        if (!querySnapshot.empty) {
          const docSnap = querySnapshot.docs[0];
          docId = docSnap.id;
          foundComplaint = docSnap.data() as Complaint;
        }

        if (!foundComplaint && docId === '') {
          // Check if id is the docId itself
          const docRef = doc(db, 'complaints', id);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            docId = id;
            foundComplaint = docSnap.data() as Complaint;
          }
        }

        if (!foundComplaint) {
          return res.status(404).json({ error: 'Complaint not found' });
        }

        const updates: any = { updatedAt: new Date().toISOString() };
        if (status) {
          updates.status = status;
          foundComplaint.status = status;
        }
        if (assignedTo !== undefined) {
          updates.assignedTo = assignedTo;
          foundComplaint.assignedTo = assignedTo;
        }
        
        let updatedComments = foundComplaint.comments || [];
        if (comment && userId) {
          const newComment = {
            id: 'com_' + Math.random().toString(36).substr(2, 5),
            userId,
            userName: userName || 'Admin',
            userRole: userRole || 'admin',
            text: comment,
            createdAt: new Date().toISOString()
          };
          updatedComments.push(newComment);
          updates.comments = updatedComments;
          foundComplaint.comments = updatedComments;
        }

        const docRef = doc(db, 'complaints', docId);
        await updateDoc(docRef, updates);

        // Award points if resolved
        if (status === 'resolved' && foundComplaint.citizenId) {
          const citizenDocRef = doc(db, 'users', foundComplaint.citizenId);
          const citizenSnap = await getDoc(citizenDocRef);
          if (citizenSnap.exists()) {
            const curPoints = citizenSnap.data().points || 0;
            const { setDoc } = await import('firebase/firestore'); await setDoc(citizenDocRef, { points: curPoints + 50 }, { merge: true });
          }

          // Trigger resolve notification
          const notificationsCol = collection(db, 'notifications');
          await addDoc(notificationsCol, {
            userId: foundComplaint.citizenId,
            title: 'Report Cleaned! +50 XP 🌟',
            message: `Awesome! Municipal teams have resolved your complaint at ${foundComplaint.address}. Earned +50 points!`,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      } else {
        // Local in-memory
        const idx = mockComplaints.findIndex(c => c.id === id);
        if (idx === -1) {
          return res.status(404).json({ error: 'Complaint not found' });
        }

        foundComplaint = mockComplaints[idx];
        foundComplaint.updatedAt = new Date().toISOString();
        if (status) foundComplaint.status = status;
        if (assignedTo !== undefined) foundComplaint.assignedTo = assignedTo;
        
        if (comment && userId) {
          const newComment = {
            id: 'com_' + Math.random().toString(36).substr(2, 5),
            userId,
            userName: userName || 'Admin',
            userRole: userRole || 'admin',
            text: comment,
            createdAt: new Date().toISOString()
          };
          if (!foundComplaint.comments) foundComplaint.comments = [];
          foundComplaint.comments.push(newComment);
        }

        // Award points if resolved
        if (status === 'resolved' && foundComplaint.citizenId) {
          const userIdx = mockUsers.findIndex(u => u.uid === foundComplaint!.citizenId);
          if (userIdx !== -1) {
            mockUsers[userIdx].points += 50;
          }

          mockNotifications.unshift({
            id: 'n_' + Math.random().toString(36).substr(2, 5),
            userId: foundComplaint.citizenId,
            title: 'Report Cleaned! +50 XP 🌟',
            message: `Awesome! Municipal teams have resolved your complaint at ${foundComplaint.address}. Earned +50 points!`,
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }

      res.json(foundComplaint);
    } catch (e: any) {
      console.error('Update complaint error details:', e); console.error(e.stack);
      res.status(500).json({ error: e.message });
    }
  });

  // 7. Leaderboard
  app.get('/api/users/leaderboard', async (req, res) => {
    try {
      let usersList: User[] = [];

      if (isFirebaseEnabled) {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, orderBy('points', 'desc'), limit(15));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {} else {
          querySnapshot.forEach((docSnap) => {
            usersList.push(docSnap.data() as User);
          });
        }
      } else {
        usersList = [...mockUsers];
      }

      // Filter only citizen roles for leaderboard, sorted descending by points
      const citizens = usersList
        .filter(u => u.role !== 'admin')
        .sort((a, b) => b.points - a.points)
        .map((u, i) => ({
          uid: u.uid,
          name: u.name,
          points: u.points,
          rank: i + 1,
          avatar: u.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(u.name)}`
        }));

      res.json(citizens);
    } catch (e: any) {
      console.error('Fetch leaderboard error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 8. Notifications
  app.get('/api/notifications', async (req, res) => {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ error: 'userId query is required' });
    }

    try {
      let notifsList: Notification[] = [];

      if (isFirebaseEnabled) {
        const notifsCol = collection(db, 'notifications');
        const q = query(notifsCol, where('userId', '==', userId));
        const querySnapshot = await getDocs(q);
        if (querySnapshot.empty) {} else {
          querySnapshot.forEach((docSnap) => {
            const d = docSnap.data();
            notifsList.push({
              id: docSnap.id,
              userId: d.userId,
              title: d.title,
              message: d.message,
              read: d.read || false,
              createdAt: d.createdAt
            });
          });
        }
        notifsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      } else {
        notifsList = mockNotifications.filter(n => n.userId === userId);
      }

      res.json(notifsList);
    } catch (e: any) {
      console.error('Fetch notifications error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 9. Mark Notification as Read
  app.post('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;

    try {
      if (isFirebaseEnabled) {
        const notifDocRef = doc(db, 'notifications', id);
        await updateDoc(notifDocRef, { read: true });
      } else {
        const notif = mockNotifications.find(n => n.id === id);
        if (notif) {
          notif.read = true;
        }
      }
      res.json({ success: true });
    } catch (e: any) {
      console.error('Mark notification read error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 10. Analytics Aggregate
  app.get('/api/analytics', async (req, res) => {
    try {
      let complaints: Complaint[] = [];

      if (isFirebaseEnabled) {
        const complaintsCol = collection(db, 'complaints');
        const querySnapshot = await getDocs(complaintsCol);
        if (querySnapshot.empty) {} else {
          querySnapshot.forEach((docSnap) => {
            complaints.push(docSnap.data() as Complaint);
          });
        }
      } else {
        complaints = [...mockComplaints];
      }

      // Calculations
      const total = complaints.length;
      const pending = complaints.filter(c => c.status === 'pending').length;
      const assigned = complaints.filter(c => c.status === 'assigned').length;
      const resolved = complaints.filter(c => c.status === 'resolved').length;

      // Classifications
      const wasteTypeCounts: { [key: string]: number } = {};
      complaints.forEach(c => {
        wasteTypeCounts[c.wasteType] = (wasteTypeCounts[c.wasteType] || 0) + 1;
      });

      // Severity levels
      const avgSeverity = total > 0 ? Number((complaints.reduce((acc, c) => acc + c.severity, 0) / total).toFixed(1)) : 0;

      // Area/Address counts
      const areaPollution: { [key: string]: number } = {};
      complaints.forEach(c => {
        // Simple parser for district
        const street = c.address.split(',')[0] || 'Unknown Zone';
        areaPollution[street] = (areaPollution[street] || 0) + 1;
      });

      const structuredAreaPollution = Object.keys(areaPollution).map(name => ({
        name,
        count: areaPollution[name]
      })).sort((a, b) => b.count - a.count).slice(0, 5);

      const structuredWasteTypes = Object.keys(wasteTypeCounts).map(type => ({
        name: type,
        value: wasteTypeCounts[type]
      }));

      // Timeline reports last 7 days
      const timeline: { [key: string]: { reported: number, resolved: number } } = {};
      for (let i = 6; i >= 0; i--) {
        const dateStr = new Date(Date.now() - i * 24 * 3600 * 1000).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        timeline[dateStr] = { reported: 0, resolved: 0 };
      }

      complaints.forEach(c => {
        const dateStr = new Date(c.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        if (timeline[dateStr]) {
          timeline[dateStr].reported += 1;
        }
        if (c.status === 'resolved') {
          const resDateStr = new Date(c.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
          if (timeline[resDateStr]) {
            timeline[resDateStr].resolved += 1;
          }
        }
      });

      const structuredTimeline = Object.keys(timeline).map(date => ({
        date,
        reported: timeline[date].reported,
        resolved: timeline[date].resolved
      }));

      res.json({
        total,
        pending,
        assigned,
        resolved,
        resolvedPercentage: total > 0 ? Math.round((resolved / total) * 100) : 0,
        avgSeverity,
        wasteTypes: structuredWasteTypes,
        areaPollution: structuredAreaPollution,
        timeline: structuredTimeline
      });
    } catch (e: any) {
      console.error('Fetch analytics error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 11. Get Crews
  app.get('/api/crews', async (req, res) => {
    try {
      let crewsList: Crew[] = [];

      if (isFirebaseEnabled) {
        const crewsCol = collection(db, 'crews');
        const querySnapshot = await getDocs(crewsCol);
        
        if (querySnapshot.empty) {} else {
          querySnapshot.forEach((docSnap) => {
            crewsList.push(docSnap.data() as Crew);
          });
        }
      } else {
        crewsList = [...mockCrews];
      }

      res.json(crewsList);
    } catch (e: any) {
      console.error('Fetch crews error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // 12. Update/Save Crew location & status
  app.post('/api/crews', async (req, res) => {
    const { name, lat, lng, status, assignedComplaintId } = req.body;
    if (!name || lat === undefined || lng === undefined || !status) {
      return res.status(400).json({ error: 'Missing crew name, coordinates, or status' });
    }

    let finalLat = Number(lat);
    let finalLng = Number(lng);

    // If crew is assigned a task and status is active_cleaning, their location must snap to the cleaning spot
    if (assignedComplaintId && status === 'active_cleaning') {
      try {
        let foundComplaint: any = null;
        if (isFirebaseEnabled) {
          const { doc, getDoc, collection, query, where, getDocs } = await import('firebase/firestore');
          const docRef = doc(db, 'complaints', assignedComplaintId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            foundComplaint = docSnap.data();
          } else {
            const complaintsCol = collection(db, 'complaints');
            const q = query(complaintsCol, where('id', '==', assignedComplaintId));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              foundComplaint = querySnapshot.docs[0].data();
            }
          }
        } else {
          foundComplaint = mockComplaints.find(c => c.id === assignedComplaintId);
        }

        if (foundComplaint) {
          finalLat = Number(foundComplaint.lat);
          finalLng = Number(foundComplaint.lng);
        }
      } catch (err) {
        console.error('Error snapping crew location to assigned task:', err);
      }
    }

    const updatedCrew: Crew = {
      name,
      lat: finalLat,
      lng: finalLng,
      status,
      assignedComplaintId: assignedComplaintId || '',
      updatedAt: new Date().toISOString()
    };

    try {
      if (isFirebaseEnabled) {
        const { doc, setDoc } = await import('firebase/firestore');
        const crewDocRef = doc(db, 'crews', name);
        await setDoc(crewDocRef, updatedCrew);
      } else {
        const idx = mockCrews.findIndex(c => c.name === name);
        if (idx !== -1) {
          mockCrews[idx] = updatedCrew;
        } else {
          mockCrews.push(updatedCrew);
        }
      }

      res.json(updatedCrew);
    } catch (e: any) {
      console.error('Update crew error:', e);
      res.status(500).json({ error: e.message });
    }
  });

  // --- VITE MIDDLEWARE SETUP ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
