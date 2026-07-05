import React, { useState, useEffect, useRef } from 'react';
import { 
  Trash2, 
  Upload, 
  MapPin, 
  Shield, 
  ShieldAlert, 
  Award, 
  Bell, 
  CheckCircle2, 
  AlertTriangle, 
  AlertCircle,
  MessageSquare, 
  HelpCircle, 
  Loader2, 
  RefreshCw, 
  BarChart3, 
  Users, 
  Clock, 
  LogIn, 
  ChevronRight, 
  Sparkles, 
  Filter, 
  Search, 
  Download, 
  BookOpen, 
  LogOut, 
  ArrowRight, 
  Trophy, 
  Heart,
  User,
  Activity,
  CheckCircle,
  Eye,
  Plus,
  Truck,
  Compass,
  Navigation
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell, 
  LineChart, 
  Line 
} from 'recharts';

import MapContainer from './components/MapContainer';
import ChatBot from './components/ChatBot';
import { Complaint, User as UserType, Notification, LeaderboardUser, Crew } from './types';
import { triggerPDFDownload } from './lib/mockData';



export default function App() {
  // Page routing state
  const [currentView, setCurrentView] = useState<'landing' | 'citizen' | 'admin' | 'crew'>('landing');
  
  // Real-time crew tracking states
  const [crews, setCrews] = useState<Crew[]>([]);
  const [isLoadingCrews, setIsLoadingCrews] = useState(false);
  const [selectedCrewName, setSelectedCrewName] = useState<string>('');

  // Authentication & session state
  const [user, setUser] = useState<UserType | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    // Firebase auth disabled for now as requested
    const savedUser = sessionStorage.getItem('mockUser');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
      const role = JSON.parse(savedUser).role;
      setCurrentView(role === 'admin' ? 'admin' : 'citizen');
    }
    setAuthInitialized(true);
  }, []);

  // Complaints & Notifications list states
  const [complaints, setComplaints] = useState<Complaint[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);

  // Loading indicator states
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [isLoadingLeaderboard, setIsLoadingLeaderboard] = useState(false);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  // Citizen report form states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState<any>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [customDescription, setCustomDescription] = useState('');
  const [manualCoords, setManualCoords] = useState<{lat: number, lng: number, address: string} | null>(null);

  // Admin Adding Crew States
  const [newCrewName, setNewCrewName] = useState('');
  const [newCrewLat, setNewCrewLat] = useState('19.0760');
  const [newCrewLng, setNewCrewLng] = useState('72.8777');
  const [newCrewStatus, setNewCrewStatus] = useState<'idle' | 'on_route' | 'active_cleaning'>('idle');
  const [isAddingCrew, setIsAddingCrew] = useState(false);

  // Geocoding Autocomplete States
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const [showSuggestionDropdown, setShowSuggestionDropdown] = useState(false);
  const autocompleteRef = useRef<HTMLDivElement>(null);

  // Click outside to close suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestionDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleAddressChange = async (value: string) => {
    setManualCoords(prev => {
      const base = prev || { lat: 19.0760, lng: 72.8777, address: '' };
      return { ...base, address: value };
    });

    if (!value || value.trim().length < 3) {
      setAddressSuggestions([]);
      setShowSuggestionDropdown(false);
      return;
    }

    setIsFetchingSuggestions(true);
    setShowSuggestionDropdown(true);

    try {
      const MAPTILER_KEY = 'UE7iZNNqIhT01qV7bUd2';
      const url = `https://api.maptiler.com/geocoding/${encodeURIComponent(value)}.json?key=${MAPTILER_KEY}&bbox=68.1,8.0,97.4,37.6&autocomplete=true&limit=6`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data && data.features) {
          setAddressSuggestions(data.features);
        } else {
          setAddressSuggestions([]);
        }
      }
    } catch (err) {
      console.error('Error fetching geocoding suggestions:', err);
    } finally {
      setIsFetchingSuggestions(false);
    }
  };

  const handleSelectSuggestion = (suggestion: any) => {
    const address = suggestion.place_name || '';
    const coords = suggestion.geometry?.coordinates; // [longitude, latitude] in GeoJSON
    if (coords && coords.length >= 2) {
      const lng = coords[0];
      const lat = coords[1];
      setManualCoords({ lat, lng, address });
    } else {
      setManualCoords(prev => ({ ...(prev || { lat: 19.0760, lng: 72.8777 }), address }));
    }
    setAddressSuggestions([]);
    setShowSuggestionDropdown(false);
  };

  const [reportingStep, setReportingStep] = useState<1 | 2>(1); // 1: upload/analyze, 2: confirm location/submit
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  // Filters and UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [showNotifications, setShowNotifications] = useState(false);
  const [selectedComplaint, setSelectedComplaint] = useState<Complaint | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'report' | 'leaderboard'>('overview');
  const [citizenReportScope, setCitizenReportScope] = useState<'all' | 'mine'>('all');
  const [adminSelectedComplaint, setAdminSelectedComplaint] = useState<Complaint | null>(null);
  const [assignee, setAssignee] = useState('');

  // Dynamic metrics calculations for landing/dashboard overview
  const totalReportsCount = complaints.length;
  
  const resolvedRatePercentage = analytics?.resolvedPercentage !== undefined
    ? analytics.resolvedPercentage
    : (totalReportsCount > 0
      ? Math.round((complaints.filter(c => c.status === 'resolved').length / totalReportsCount) * 100)
      : 100);
  
  const aiAccuracyRate = totalReportsCount > 0
    ? (complaints.reduce((acc, c) => acc + (c.confidence || 0), 0) / totalReportsCount).toFixed(1)
    : '0.0';

  const latestComplaint = complaints.length > 0
    ? [...complaints].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
    : null;

  const totalCivicXPEarned = leaderboard.length > 0
    ? leaderboard.reduce((acc, u) => acc + (u.points || 0), 0)
    : 0;

  // Fetch standard data lists from server API
  const fetchComplaints = async (isSilent = false) => {
    if (!isSilent) setIsLoadingComplaints(true);
    try {
      const res = await fetch('/api/complaints');
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
      }
    } catch (e) {
      console.error('Error loading complaints:', e);
    } finally {
      if (!isSilent) setIsLoadingComplaints(false);
    }
  };

  const fetchNotifications = async () => {
    if (!user) return;
    setIsLoadingNotifications(true);
    try {
      const res = await fetch(`/api/notifications?userId=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (e) {
      console.error('Error loading notifications:', e);
    } finally {
      setIsLoadingNotifications(false);
    }
  };

  const fetchLeaderboard = async () => {
    setIsLoadingLeaderboard(true);
    try {
      const res = await fetch('/api/users/leaderboard');
      if (res.ok) {
        const data = await res.json();
        setLeaderboard(data);
      }
    } catch (e) {
      console.error('Error loading leaderboard:', e);
    } finally {
      setIsLoadingLeaderboard(false);
    }
  };

  const fetchAnalytics = async (isSilent = false) => {
    if (!isSilent) setIsLoadingAnalytics(true);
    try {
      const res = await fetch('/api/analytics');
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error('Error loading analytics:', e);
    } finally {
      if (!isSilent) setIsLoadingAnalytics(false);
    }
  };

  const fetchCrews = async (isSilent = false) => {
    if (!isSilent) setIsLoadingCrews(true);
    try {
      const res = await fetch('/api/crews');
      if (res.ok) {
        const data = await res.json();
        setCrews(data);
      }
    } catch (e) {
      console.error('Error loading crews:', e);
    } finally {
      if (!isSilent) setIsLoadingCrews(false);
    }
  };

  
  useEffect(() => {
    fetchComplaints();
    fetchLeaderboard();
    fetchAnalytics();
    fetchCrews();
  }, []);

  // Background real-time live interval polling for crews, complaints, and analytics
  useEffect(() => {
    const interval = setInterval(() => {
      fetchCrews(true);
      fetchComplaints(true);
      fetchAnalytics(true);
    }, 2500); // 2.5s interval for snappy live updates without flickering indicators
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const handleAuthSubmit = async (role: 'admin' | 'citizen', email: string) => {
    sessionStorage.setItem('requestedRole', role);
    setShowAuthModal(false);
    
    // Mock login without google
    try {
      const mockUid = role === 'admin' ? 'admin-uid' : 'citizen-uid-445';
      const name = email.split('@')[0];
      const res = await fetch('/api/users/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid: mockUid,
          email: email,
          name: name.charAt(0).toUpperCase() + name.slice(1),
          role: role,
          avatar: ''
        })
      });
      const serverUser = await res.json();
      setUser(serverUser);
      sessionStorage.setItem('mockUser', JSON.stringify(serverUser));
      setCurrentView(serverUser.role === 'admin' ? 'admin' : 'citizen');
    } catch (error) {
      console.error("Error syncing user:", error);
    }
  };

  const handleLogout = async () => {
    sessionStorage.removeItem('mockUser');
    sessionStorage.removeItem('requestedRole');
    setUser(null);
    setCurrentView('landing');
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
        setAiResult(null);
        setAnalysisError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyzeImage = async () => {
    if (!selectedImage) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    // Configurable Indian coordinate boundaries and fallback locations
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

    try {
      const explicitLocationPrompt = `Identify and deduce the precise city, state, and country from the image content (signs, storefronts, language, architecture, vehicle license plates, vegetation, soil, landmarks) or embedded metadata.
CRITICAL CONSTRAINT: The location must be resolved to a place in India. If the image context is ambiguous, do NOT default to San Francisco or any US location. Instead, assign a realistic street address and coordinates within India, such as in Mumbai (around Lat 19.0760, Lng 72.8777), Delhi (around Lat 28.6139, Lng 77.2090), or other major Indian metro areas.`;

      const res = await fetch('/api/analyze-waste', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          imageBase64: selectedImage,
          locationPrompt: explicitLocationPrompt
        })
      });

      if (res.ok) {
        const data = await res.json();
        setAiResult(data);
        setReportingStep(2);

        let parsedLat = parseFloat(data.latitude || data.lat);
        let parsedLng = parseFloat(data.longitude || data.lng);
        let parsedAddress = data.address || '';

        const isValidLat = !isNaN(parsedLat);
        const isValidLng = !isNaN(parsedLng);

        // Bounding box verification for India
        const isWithinIndia = isValidLat && isValidLng && 
          parsedLat >= INDIAN_LAT_MIN && parsedLat <= INDIAN_LAT_MAX && 
          parsedLng >= INDIAN_LNG_MIN && parsedLng <= INDIAN_LNG_MAX;

        const isSanFrancisco = isValidLat && isValidLng &&
          Math.abs(parsedLat - 37.7749) < 0.5 && Math.abs(parsedLng - (-122.4194)) < 0.5;

        if (!isWithinIndia || isSanFrancisco) {
          // Select a fallback Indian location (e.g., Mumbai)
          const fallback = FALLBACK_INDIAN_LOCATIONS[Math.floor(Math.random() * FALLBACK_INDIAN_LOCATIONS.length)];
          parsedLat = fallback.lat;
          parsedLng = fallback.lng;
          parsedAddress = fallback.address;
        }

        setManualCoords({
          lat: parsedLat,
          lng: parsedLng,
          address: parsedAddress || 'Mumbai, Maharashtra, India'
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setAnalysisError(errorData.error || 'Failed to analyze image. Please try again.');
      }
    } catch (err: any) {
      console.error('Analyze error:', err);
      setAnalysisError(err.message || 'Network error occurred during image analysis.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmitReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedImage || !aiResult) return;
    setIsSubmittingReport(true);
    try {
      const payload = {
        citizenId: user.uid,
        citizenName: user.name,
        imageUrl: selectedImage,
        description: customDescription ? `${customDescription}\n\nAI Analysis: ${aiResult.description || ''}` : aiResult.description || 'No extra descriptions provided.',
        wasteType: aiResult.wasteType,
        confidence: aiResult.confidence,
        severity: aiResult.severity,
        priority: aiResult.priority,
        cleanlinessRating: aiResult.cleanlinessRating,
        environmentalImpact: aiResult.environmentalImpact,
        recommendation: aiResult.recommendation,
        lat: manualCoords?.lat || 19.0760,
        lng: manualCoords?.lng || 72.8777,
        address: manualCoords?.address || 'Mumbai, India'
      };

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const newComplaint = await res.json();
        setComplaints(prev => [newComplaint, ...prev]);
        setSelectedImage(null);
        setAiResult(null);
        setActiveTab('overview');
        fetchAnalytics();
        fetchLeaderboard();
      }
    } catch (err) {
      console.error('Submit report error:', err);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  const handleAssignComplaint = async (complaintId: string) => {
    if (!assignee) return;
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'assigned',
          assignedTo: assignee
        })
      });
      if (res.ok) {
        const updated = await res.json();
        setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
        setAdminSelectedComplaint(updated);

        // Also update the matching crew's assignedComplaintId and set status to 'on_route'
        const existingCrew = crews.find(c => c.name === assignee);
        if (existingCrew) {
          await handleUpdateCrew(
            existingCrew.name,
            existingCrew.lat,
            existingCrew.lng,
            'on_route',
            complaintId
          );
        }

        fetchAnalytics();
      }
    } catch (err) {
      console.error('Assign complaint error:', err);
    }
  };

  const handleUpdateCrew = async (name: string, lat: number, lng: number, status: 'idle' | 'on_route' | 'active_cleaning', assignedComplaintId?: string) => {
    try {
      let finalLat = lat;
      let finalLng = lng;

      if (assignedComplaintId && status === 'active_cleaning') {
        const matchingComplaint = complaints.find(c => c.id === assignedComplaintId);
        if (matchingComplaint) {
          finalLat = matchingComplaint.lat;
          finalLng = matchingComplaint.lng;
        }
      }

      const res = await fetch('/api/crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, lat: finalLat, lng: finalLng, status, assignedComplaintId })
      });
      if (res.ok) {
        await fetchCrews();
        fetchAnalytics();
      } else {
        const err = await res.json();
        alert('Failed to update crew: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Update crew error:', err);
    }
  };

  // Admin: Resolve complaint
  const handleResolveComplaint = async (complaintId: string) => {
    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'resolved'
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
        setAdminSelectedComplaint(updated);
        fetchAnalytics();
      }
    } catch (err) {
      console.error('Resolve complaint error:', err); alert('Error resolving complaint: ' + (err.message || JSON.stringify(err)));
    }
  };

  // Admin: Add new municipal cleaning crew
  const handleAdminAddCrew = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCrewName.trim()) {
      alert('Please enter a squad name');
      return;
    }
    const latNum = parseFloat(newCrewLat);
    const lngNum = parseFloat(newCrewLng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      alert('Please enter valid coordinates');
      return;
    }

    setIsAddingCrew(true);
    try {
      const res = await fetch('/api/crews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCrewName.trim(),
          lat: latNum,
          lng: lngNum,
          status: newCrewStatus,
          assignedComplaintId: ''
        })
      });
      if (res.ok) {
        setNewCrewName('');
        setNewCrewLat('19.0760');
        setNewCrewLng('72.8777');
        setNewCrewStatus('idle');
        await fetchCrews();
        fetchAnalytics();
      } else {
        const err = await res.json();
        alert('Failed to add crew: ' + (err.error || 'Unknown error'));
      }
    } catch (err) {
      console.error('Error adding crew:', err);
      alert('Error connecting to server');
    } finally {
      setIsAddingCrew(false);
    }
  };

  const handleRandomizeNewCrewCoords = () => {
    const lat = (19.00 + Math.random() * 0.25).toFixed(6);
    const lng = (72.80 + Math.random() * 0.15).toFixed(6);
    setNewCrewLat(lat);
    setNewCrewLng(lng);
  };

  // Admin or Citizen: Add comments
  const handleAddComment = async (complaintId: string) => {
    if (!newComment.trim() || !user) return;
    setIsSubmittingComment(true);

    try {
      const res = await fetch(`/api/complaints/${complaintId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          comment: newComment.trim(),
          userId: user.uid,
          userName: user.name,
          userRole: user.role
        })
      });

      if (res.ok) {
        const updated = await res.json();
        setComplaints(prev => prev.map(c => c.id === updated.id ? updated : c));
        if (currentView === 'admin') {
          setAdminSelectedComplaint(updated);
        } else {
          setSelectedComplaint(updated);
        }
        setNewComment('');
      }
    } catch (err) {
      console.error('Add comment failed:', err);
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Notification helper
  const handleMarkNotifRead = async (id: string) => {
    try {
      const res = await fetch(`/api/notifications/${id}/read`, { method: 'POST' });
      if (res.ok) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Simple filters mapping
  const filteredComplaints = complaints.filter(c => {
    const matchesSearch = c.address.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          c.wasteType.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = filterType === 'All' || c.wasteType === filterType;
    const matchesStatus = filterStatus === 'All' || c.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  const unreadNotifsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-850 flex flex-col font-sans">
      
      {/* Dynamic Dev Demo Switcher */}
      <div className="bg-slate-900 text-slate-100 border-b border-slate-800 text-center px-4 py-2.5 flex justify-between items-center text-xs shadow-sm">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono font-bold">College SDG 11 Evaluation Dashboard</span>
        </div>
        
      </div>

      {/* Main Nav Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200/80 px-6 py-4 flex justify-between items-center shadow-xs">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentView('landing')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Trash2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold tracking-tight text-slate-900 flex items-center gap-1.5">
              EcoClean <span className="text-xs bg-emerald-500/10 text-emerald-700 font-medium px-2 py-0.5 rounded-full border border-emerald-500/20">Smart Waste</span>
            </h1>
            <p className="text-[10px] text-slate-500 font-mono">SDG 11 Sustainable Cities</p>
          </div>
        </div>

        {/* Action menu links */}
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-500">
            <button onClick={() => setCurrentView('landing')} className={`hover:text-emerald-600 transition-colors cursor-pointer ${currentView === 'landing' ? 'text-emerald-600 font-bold' : ''}`}>Home</button>
            {user && user.role === 'citizen' && (
              <button onClick={() => { setCurrentView('citizen'); setActiveTab('overview'); }} className={`hover:text-emerald-600 transition-colors cursor-pointer ${currentView === 'citizen' ? 'text-emerald-600 font-bold' : ''}`}>Citizen Portal</button>
            )}
            {user && user.role === 'admin' && (
              <button onClick={() => setCurrentView('admin')} className={`hover:text-emerald-600 transition-colors cursor-pointer ${currentView === 'admin' ? 'text-emerald-600 font-bold' : ''}`}>Municipal Admin</button>
            )}
            {/* Keeping crew portal logic same if no role attached, or just hide it until login */}
          </nav>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            {user && (
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)} 
                  className="p-2 bg-slate-100 border border-slate-200/80 rounded-xl hover:text-emerald-600 transition-all text-slate-700 hover:bg-slate-200/50"
                >
                  <Bell className="w-4 h-4" />
                  {unreadNotifsCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-[10px] font-bold text-white w-4.5 h-4.5 rounded-full flex items-center justify-center animate-pulse">
                      {unreadNotifsCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown Panel */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200/90 rounded-xl p-4 shadow-xl z-50 text-xs text-slate-700 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-2 mb-2">
                      <span className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Bell className="w-3.5 h-3.5 text-emerald-600" /> Notifications
                      </span>
                      <button onClick={() => setShowNotifications(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                    </div>
                    <div className="space-y-2 max-h-60 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="text-center py-6 text-slate-400">No active alerts.</div>
                      ) : (
                        notifications.map(notif => (
                          <div 
                            key={notif.id} 
                            onClick={() => handleMarkNotifRead(notif.id)}
                            className={`p-2 rounded-lg cursor-pointer transition-colors ${notif.read ? 'bg-slate-50/50 opacity-70' : 'bg-emerald-50 border-l-4 border-emerald-500 rounded-r-lg'}`}
                          >
                            <div className="font-bold text-slate-800 flex justify-between items-center">
                              <span>{notif.title}</span>
                              {!notif.read && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>}
                            </div>
                            <p className="text-[11px] text-slate-600 mt-0.5 leading-normal">{notif.message}</p>
                            <span className="text-[9px] text-slate-400 font-mono mt-1 block">{new Date(notif.createdAt).toLocaleDateString()}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Profile Avatar Widget */}
            {user ? (
              <div className="flex items-center gap-2.5 bg-white border border-slate-200/80 px-3 py-1.5 rounded-xl shadow-xs">
                <img 
                  src={user.avatar || `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(user.name)}`} 
                  alt="Avatar" 
                  className="w-7.5 h-7.5 rounded-lg object-cover bg-slate-100 border border-emerald-500/20"
                  referrerPolicy="no-referrer"
                />
                <div className="hidden sm:block text-left">
                  <div className="text-xs font-bold text-slate-800 leading-none">{user.name}</div>
                  <div className="text-[9px] text-emerald-600 mt-0.5 font-mono flex items-center gap-1 font-semibold">
                    {user.role === 'admin' ? (
                      <>
                        <Shield className="w-2.5 h-2.5" /> MUNICIPAL ADMIN
                      </>
                    ) : (
                      <>
                        <Award className="w-2.5 h-2.5" /> {user.points} XP POINTS
                      </>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="ml-2 bg-rose-50 text-rose-600 border border-rose-100 hover:bg-rose-100 p-1.5 rounded-lg text-[10px] font-bold"
                  title="Logout"
                >
                  <LogIn className="w-3.5 h-3.5 rotate-180" />
                </button>
              </div>
            ) : (
              <button 
                onClick={() => { setShowAuthModal(true); }}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/10"
              >
                <LogIn className="w-4 h-4" /> Join Portal
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-6 py-8">
        
        {/* ========================================================
            1. LANDING PAGE
            ======================================================== */}
        {currentView === 'landing' && (
          <div className="space-y-20 py-4 animate-in fade-in duration-500">
            {/* Hero Section */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-7 space-y-6 text-left">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-200 text-emerald-700 rounded-full text-xs font-semibold shadow-xs">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                  Gemini Vision AI Integration
                </span>
                <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-slate-900 leading-tight">
                  Building Cleaner <br />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">
                    Cities with AI
                  </span>
                </h1>
                <p className="text-slate-600 text-base max-w-xl leading-relaxed">
                  Join municipal authorities and citizens in real-time. Upload garbage dump photo reports, let Gemini analyze the waste severity, and watch collection crews clear them instantly to secure our Sustainable Cities objective (SDG 11).
                </p>
                <div className="flex flex-wrap gap-4 pt-3">
                  <button 
                    onClick={() => {
                      if (!user) setShowAuthModal(true);
                      else {
                        if (user.role === 'admin') setCurrentView('admin');
                        else { setCurrentView('citizen'); setActiveTab('report'); }
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-md shadow-emerald-600/20 flex items-center gap-2 group hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
                  >
                    Report Garbage Now
                    <ArrowRight className="w-4.5 h-4.5 group-hover:translate-x-1 transition-transform" />
                  </button>
                  <button 
                    onClick={() => {
                      if (!user) setShowAuthModal(true);
                      else {
                        if (user.role === 'admin') setCurrentView('admin');
                        else { setCurrentView('citizen'); setActiveTab('overview'); }
                      }
                    }}
                    className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold text-sm px-6 py-3.5 rounded-xl transition-all shadow-xs cursor-pointer"
                  >
                    Dashboard Login
                  </button>
                </div>
              </div>
                           <div className="lg:col-span-5 relative">
                {/* Floating Glass Box Visual Panel */}
                <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 opacity-10 blur-xl"></div>
                <div className="relative border border-slate-200/80 bg-white/90 backdrop-blur-md rounded-2xl p-6 shadow-xl space-y-6">
                  <div className="flex justify-between items-center border-b border-slate-150 pb-4">
                    <span className="text-xs font-mono text-emerald-600 font-bold">
                      {latestComplaint ? 'LATEST REPORT FEED' : 'CITIZEN UPLOAD SIMULATOR'}
                    </span>
                    <span className={`text-[10px] border px-2 py-0.5 rounded-full font-medium ${
                      latestComplaint 
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                        : 'bg-slate-100 text-slate-600 border-slate-200'
                    }`}>
                      {latestComplaint ? 'ACTIVE ANALYZER' : 'AWAITING REPORTS'}
                    </span>
                  </div>
                  <div className="aspect-video w-full rounded-xl bg-slate-100 overflow-hidden relative border border-slate-200 flex items-center justify-center">
                    {latestComplaint ? (
                      <img 
                        src={latestComplaint.imageUrl} 
                        alt={latestComplaint.wasteType || 'Reported waste'} 
                        className="w-full h-full object-cover opacity-65"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <img 
                        src="https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=600&q=80" 
                        alt="Serene Green City" 
                        className="w-full h-full object-cover opacity-65"
                        referrerPolicy="no-referrer"
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/85 via-slate-900/10 to-transparent"></div>
                    <div className="absolute bottom-4 left-4 right-4 bg-white/95 border border-slate-200 rounded-lg p-3 text-xs flex justify-between items-center shadow-md">
                      <div className="flex items-center gap-2">
                        <Sparkles className={`w-4 h-4 text-emerald-600 ${latestComplaint ? 'animate-pulse' : ''}`} />
                        <div>
                          <div className="font-bold text-slate-900">
                            {latestComplaint 
                              ? (latestComplaint.status === 'pending' ? 'Classifying...' : latestComplaint.status === 'assigned' ? 'Assigned' : 'Resolved')
                              : 'All Clear'}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {latestComplaint ? 'Evaluating eco danger score' : 'Awaiting new citizen uploads'}
                          </div>
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold text-rose-600">
                        Severity: {latestComplaint ? `${latestComplaint.severity}/10` : '0/10'}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-slate-600">
                      <span>Waste classified:</span>
                      <span className="font-bold text-emerald-700">
                        {latestComplaint 
                          ? `${latestComplaint.wasteType} (${latestComplaint.confidence}% accuracy)` 
                          : 'No waste detected (0% accuracy)'}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                        style={{ width: `${latestComplaint ? latestComplaint.confidence : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Platform Stats Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
              <div className="glass-card p-6 rounded-2xl shadow-xs text-left hover:scale-[1.02] transition-transform duration-200">
                <span className="text-slate-500 font-mono text-xs uppercase tracking-wider">Reports Cataloged</span>
                <div className="text-3xl font-black text-slate-900">{analytics?.total || complaints.length}+</div>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Real-time GPS tracker</p>
              </div>
              <div className="glass-card p-6 rounded-2xl shadow-xs text-left hover:scale-[1.02] transition-transform duration-200">
                <span className="text-slate-500 font-mono text-xs uppercase tracking-wider">Resolved Rate</span>
                <div className="text-3xl font-black text-slate-900">{resolvedRatePercentage}%</div>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5 font-sans">Cleansed within 24 hours</p>
              </div>
              <div className="glass-card p-6 rounded-2xl shadow-xs text-left hover:scale-[1.02] transition-transform duration-200">
                <span className="text-slate-500 font-mono text-xs uppercase tracking-wider">AI Accuracy Rate</span>
                <div className="text-3xl font-black text-slate-900">{aiAccuracyRate}%</div>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Gemini 2.5 classification</p>
              </div>
              <div className="glass-card p-6 rounded-2xl shadow-xs text-left hover:scale-[1.02] transition-transform duration-200">
                <span className="text-slate-500 font-mono text-xs uppercase tracking-wider">Civic XP Earned</span>
                <div className="text-3xl font-black text-slate-900">{totalCivicXPEarned.toLocaleString()}</div>
                <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">User reward programs active</p>
              </div>
            </div>

            {/* How it Works Module */}
            <div className="space-y-10 text-center">
              <div className="max-w-xl mx-auto space-y-3">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">How Citizens Empower SDG 11</h2>
                <p className="text-slate-500 text-xs">Four automated steps to transform hazardous litter piles into sanitized public gardens.</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-left">
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-sm transition-shadow duration-200">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold font-mono">01</div>
                  <h3 className="font-bold text-slate-900 text-sm font-sans">Snap & Upload</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">Upload a trash heap image on our mobile web application. Your accurate GPS coordinates are locked immediately.</p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-sm transition-shadow duration-200">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold font-mono">02</div>
                  <h3 className="font-bold text-slate-900 text-sm font-sans">AI Diagnosis</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">Gemini Vision catalogs the waste category (e.g. plastic, biohazard), estimates environmental damage, and rates severity (1-10).</p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-sm transition-shadow duration-200">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold font-mono">03</div>
                  <h3 className="font-bold text-slate-900 text-sm font-sans">Municipal Routing</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">Admins prioritize cleanup efforts according to AI severity ranks, instantly routing specified collector teams (e.g. hazardous or composters).</p>
                </div>
                <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-xs space-y-4 hover:shadow-sm transition-shadow duration-200">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 flex items-center justify-center font-bold font-mono">04</div>
                  <h3 className="font-bold text-slate-900 text-sm font-sans">Earn XP Rewards</h3>
                  <p className="text-slate-500 text-xs leading-relaxed">Once the collection squad uploads proof of resolution, the citizen receives +50 XP and rises up the civic conservation leaderboard.</p>
                </div>
              </div>
            </div>

            {/* Features Spotlight */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div className="relative border border-slate-200 bg-white rounded-2xl overflow-hidden p-1 shadow-lg">
                <MapContainer complaints={complaints} crews={crews} />
              </div>
              <div className="space-y-6 text-left">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">Live Smart City Geographic Maps</h2>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Every reported issue is pinned on a customized, high-contrast geographical map. Admins can toggle between standard pinpoint views or heatmaps to immediately spot high-density trash corridors and schedule broad eco-cleanses.
                </p>
                <div className="space-y-3.5">
                  <div className="flex gap-3 items-start text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 block font-sans">Visual Marker Popovers</span>
                      <p className="text-slate-500">Inspect the uploaded image, AI severity score, date, and assigned cleanup team on each pin.</p>
                    </div>
                  </div>
                  <div className="flex gap-3 items-start text-xs">
                    <CheckCircle className="w-4 h-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-slate-900 block font-sans">Live Pollution Heatmaps</span>
                      <p className="text-slate-500">Gain actionable, structural spatial insight into chronic waste pileups to plan better municipal trashcan distribution.</p>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setUser(prev => prev ? { ...prev, role: 'citizen' } : null);
                    setCurrentView('citizen');
                    setActiveTab('overview');
                  }}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors mt-2 cursor-pointer"
                >
                  Inspect geographic dashboard <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* College Testimonials & Project Objective Footer */}
            <div className="border-t border-slate-200 pt-16 grid grid-cols-1 md:grid-cols-2 gap-8 text-xs text-slate-500 leading-relaxed">
              <div className="space-y-2">
                <span className="text-slate-800 font-bold block">Academic Framework</span>
                <p>Designed under the United Nations Sustainable Development Goal 11 (Sustainable Cities and Communities) to study how combining computer vision algorithms (Gemini AI API) with modern React dashboard structures can reduce response latencies in municipal cleaning dispatches.</p>
              </div>
              <div className="space-y-2">
                <span className="text-slate-800 font-bold block">Features Included</span>
                <p>User registrations, automated GPS capturing, Base64 image upload encoders, full Gemini Vision analyzer payload, assign/comment panels, dynamic PDF summaries, reward leaderboard tracker, interactive SVG-scaled maps, and an integrated FAQ EcoBot chatbot assistant.</p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            2. CITIZEN DASHBOARD VIEW
            ======================================================== */}
        {currentView === 'citizen' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header Dashboard Summary */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6 text-left">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Citizen Portal</h2>
                <p className="text-xs text-slate-500 mt-0.5">Welcome back, {user?.name}. Your reports keep our city clean!</p>
              </div>
              
              {/* Tabs buttons */}
              <div className="flex gap-1.5 bg-slate-100 border border-slate-200 p-1 rounded-xl">
                <button 
                  onClick={() => setActiveTab('overview')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'overview' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
                >
                  My Reports
                </button>
                <button 
                  onClick={() => setActiveTab('report')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'report' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
                >
                  + Report Waste
                </button>
                <button 
                  onClick={() => setActiveTab('leaderboard')}
                  className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${activeTab === 'leaderboard' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-850'}`}
                >
                  Leaderboard
                </button>
              </div>
            </div>

            {/* Tab: Overview (Citizen's complaints logs) */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Visual score card for citizens */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-gradient-to-br from-emerald-50/50 to-white border border-emerald-200 p-6 rounded-2xl flex items-center gap-4 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <Award className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-slate-500 font-mono uppercase">Your Eco Points</div>
                      <div className="text-2xl font-black text-slate-900">{user?.points || 0} XP</div>
                      <p className="text-[9px] text-slate-500 mt-0.5">Next rank at 500 XP (+150 pts)</p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4 shadow-xs">
                    <div className="w-12 h-12 rounded-xl bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700">
                      <CheckCircle2 className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <div className="text-[10px] text-slate-500 font-mono uppercase">Submitted Reports</div>
                      <div className="text-2xl font-black text-slate-900">
                        {complaints.filter(c => c.citizenId === user?.uid).length} reports
                      </div>
                      <p className="text-[9px] text-emerald-600 mt-0.5 font-semibold">
                        {complaints.filter(c => c.citizenId === user?.uid && c.status === 'resolved').length} resolved cleanups
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 p-6 rounded-2xl flex flex-col justify-center shadow-xs text-left">
                    <span className="text-[10px] text-slate-500 font-mono uppercase mb-1">Eco Fact of the Day</span>
                    <p className="text-xs text-slate-700 italic leading-relaxed">
                      "Proper waste management reduces pollution and protects our ecosystem."
                    </p>
                  </div>
                </div>

                {/* Complaints display section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  {/* Map Pinning reference */}
                  <div className="lg:col-span-7 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Geographic City Monitor</h3>
                      <span className="text-[10px] text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600" /> Active city sector map
                      </span>
                    </div>
                    <MapContainer 
                      complaints={complaints} 
                      onSelectComplaint={(c) => setSelectedComplaint(c)} 
                      selectedComplaintId={selectedComplaint?.id}
                    />
                  </div>

                  {/* List of reports */}
                  <div className="lg:col-span-5 space-y-4">
                    <div className="flex flex-col gap-2.5">
                      <div className="flex justify-between items-center">
                        <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">Reports Explorer</h3>
                        <button 
                          onClick={fetchComplaints} 
                          className="p-1 text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
                          title="Reload list"
                        >
                          <RefreshCw className="w-4 h-4" />
                        </button>
                      </div>

                      {/* Sub-tabs for scope */}
                      <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
                        <button
                          onClick={() => setCitizenReportScope('all')}
                          className={`py-1.5 font-medium rounded-lg transition-all cursor-pointer ${
                            citizenReportScope === 'all'
                              ? 'bg-white text-slate-905 font-bold shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          All City Reports ({complaints.length})
                        </button>
                        <button
                          onClick={() => setCitizenReportScope('mine')}
                          className={`py-1.5 font-medium rounded-lg transition-all cursor-pointer ${
                            citizenReportScope === 'mine'
                              ? 'bg-white text-slate-905 font-bold shadow-xs'
                              : 'text-slate-500 hover:text-slate-900'
                          }`}
                        >
                          My Reports ({complaints.filter(c => c.citizenId === user?.uid).length})
                        </button>
                      </div>
                    </div>

                    <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                      {isLoadingComplaints ? (
                        <div className="flex items-center justify-center py-16 text-slate-450 text-xs gap-2">
                          <Loader2 className="w-5 h-5 animate-spin text-emerald-500" /> Fetching latest reports...
                        </div>
                      ) : (citizenReportScope === 'mine' ? complaints.filter(c => c.citizenId === user?.uid) : complaints).length === 0 ? (
                        <div className="border border-dashed border-slate-250 rounded-xl p-8 text-center text-slate-500 text-xs space-y-3 bg-white">
                          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
                          <div>
                            <p className="font-semibold text-slate-700">No complaints logged yet</p>
                            <p className="mt-1">
                              {citizenReportScope === 'mine'
                                ? "You haven't reported any issues yet. Be the change!"
                                : "No active waste reports are currently logged in the city."}
                            </p>
                          </div>
                          {citizenReportScope === 'mine' && (
                            <button 
                              onClick={() => setActiveTab('report')}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold px-3 py-1.5 rounded-lg transition-all inline-block cursor-pointer shadow-xs"
                            >
                              + Submit First Report
                            </button>
                          )}
                        </div>
                      ) : (
                        (citizenReportScope === 'mine' ? complaints.filter(c => c.citizenId === user?.uid) : complaints).map(comp => (
                          <div 
                            key={comp.id}
                            onClick={() => setSelectedComplaint(comp)}
                            className={`border rounded-xl p-3.5 cursor-pointer transition-all ${selectedComplaint?.id === comp.id ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/15' : 'bg-white border-slate-200 hover:border-slate-350 shadow-xs'}`}
                          >
                            <div className="flex gap-3">
                              {comp.imageUrl ? (
                                <img 
                                  src={comp.imageUrl} 
                                  alt="Report thumb" 
                                  className="w-14 h-14 rounded-lg object-cover border border-slate-200 bg-slate-50 flex-shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <div className="w-14 h-14 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 flex-shrink-0"><MapPin className="w-5 h-5" /></div>
                              )}
                              <div className="flex-1 min-w-0 text-left">
                                <div className="flex justify-between items-start gap-2">
                                  <span className="font-bold text-xs text-slate-900 truncate block">{comp.wasteType} Waste</span>
                                  <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                    comp.status === 'resolved' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : (comp.status === 'assigned' ? 'bg-sky-100 text-sky-850 border border-sky-200' : 'bg-amber-100 text-amber-850 border border-amber-200')
                                  }`}>
                                    {comp.status.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">{comp.description}</p>
                                <div className="flex justify-between items-center text-[10px] text-slate-400 mt-2 font-mono">
                                  <span className="truncate max-w-[140px]">{comp.address}</span>
                                  <span>{new Date(comp.createdAt).toLocaleDateString()}</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>

                {/* Complaint detailed view overlay drawer / bottom sheet details card */}
                {selectedComplaint && (
                  <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-lg animate-in slide-in-from-bottom-5 duration-300 text-left space-y-6">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                            selectedComplaint.status === 'resolved' 
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                              : selectedComplaint.status === 'assigned'
                              ? 'bg-sky-100 text-sky-850 border-sky-200'
                              : 'bg-amber-100 text-amber-850 border-amber-200'
                          }`}>
                            {selectedComplaint.status.toUpperCase()}
                          </span>
                          <span className="text-xs text-slate-450 font-mono">{new Date(selectedComplaint.createdAt).toLocaleString()}</span>
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mt-1.5">{selectedComplaint.wasteType} Trash Heap</h3>
                        <p className="text-xs text-slate-500">{selectedComplaint.address}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Download Report Button */}
                        <button 
                          onClick={() => triggerPDFDownload(selectedComplaint)}
                          className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                          title="Download Text Report Document"
                        >
                          <Download className="w-3.5 h-3.5" /> PDF Summary
                        </button>
                        <button onClick={() => setSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                      <div className="md:col-span-4 space-y-4">
                        <img 
                           src={selectedComplaint.imageUrl} 
                          alt="Detailed waste" 
                          className="w-full h-48 rounded-xl object-cover border border-slate-200 bg-slate-50 shadow-xs"
                          referrerPolicy="no-referrer"
                        />
                        {/* Interactive Simulated QR Code for College submission */}
                        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80 flex items-center gap-3">
                          <div className="w-12 h-12 bg-white border border-slate-200 rounded p-1 flex items-center justify-center flex-shrink-0">
                            {/* Standard pixel block representational grid */}
                            <div className="grid grid-cols-4 gap-0.5 w-full h-full">
                              <div className="bg-black"></div><div className="bg-white"></div><div className="bg-black"></div><div className="bg-black"></div>
                              <div className="bg-white"></div><div className="bg-black"></div><div className="bg-white"></div><div className="bg-black"></div>
                              <div className="bg-black"></div><div className="bg-white"></div><div className="bg-black"></div><div className="bg-white"></div>
                              <div className="bg-black"></div><div className="bg-black"></div><div className="bg-white"></div><div className="bg-black"></div>
                            </div>
                          </div>
                          <div>
                            <div className="text-[10px] font-bold text-slate-800">Complaint QR Code</div>
                            <div className="text-[9px] text-slate-500 font-mono mt-0.5">Check real-time resolution status from any device</div>
                          </div>
                        </div>
                      </div>

                      <div className="md:col-span-8 space-y-6">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-500 block">AI Verified Category</span>
                            <span className="text-xs font-bold text-emerald-700 mt-0.5 block">{selectedComplaint.wasteType}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-500 block">Severity Score</span>
                            <span className="text-xs font-bold text-rose-650 mt-0.5 block">{selectedComplaint.severity}/10</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-500 block">Urgency Priority</span>
                            <span className="text-xs font-bold text-slate-700 mt-0.5 block">{selectedComplaint.priority}</span>
                          </div>
                          <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-center">
                            <span className="text-[10px] text-slate-500 block">AI Accuracy</span>
                            <span className="text-xs font-bold text-teal-700 mt-0.5 block font-mono">{selectedComplaint.confidence}%</span>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl leading-relaxed text-xs">
                            <span className="font-bold text-emerald-800 flex items-center gap-1.5 mb-1.5">
                              <Sparkles className="w-4 h-4 text-amber-600 animate-pulse" />
                              Gemini Vision Cleanup Recommendation
                            </span>
                            <p className="text-emerald-950 font-normal">{selectedComplaint.recommendation}</p>
                          </div>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div>
                              <span className="font-semibold text-slate-500 block mb-1">Environmental Impact</span>
                              <p className="text-slate-700 leading-normal">{selectedComplaint.environmentalImpact}</p>
                            </div>
                            <div>
                              <span className="font-semibold text-slate-500 block mb-1">Citizen Description</span>
                              <p className="text-slate-700 italic">"{selectedComplaint.description}"</p>
                            </div>
                          </div>

                          {selectedComplaint.assignedTo && (
                            <div className="border border-sky-100 bg-sky-50/50 p-3 rounded-xl flex items-center gap-3 text-xs text-sky-800">
                              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
                              <span>Dispatched to: <span className="font-semibold text-sky-950">{selectedComplaint.assignedTo}</span></span>
                            </div>
                          )}
                        </div>

                        {/* Comments Log Area */}
                        <div className="border-t border-slate-150 pt-5 space-y-3.5">
                          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Civic Communication Feed</h4>
                          <div className="space-y-2.5 max-h-40 overflow-y-auto">
                            {(selectedComplaint.comments || []).length === 0 ? (
                              <p className="text-[11px] text-slate-400 italic">No communication logs recorded yet.</p>
                            ) : (
                              selectedComplaint.comments!.map((com, comIdx) => (
                                <div key={comIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                                  <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                    <span className="font-semibold text-emerald-700">
                                      {com.userName} {com.userRole === 'admin' ? '🛡️ (Municipal Admin)' : '👤 (Citizen)'}
                                    </span>
                                    <span>{new Date(com.createdAt).toLocaleString()}</span>
                                  </div>
                                  <p className="text-slate-700 leading-normal">{com.text}</p>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Write Comment */}
                          <div className="flex gap-2 items-center pt-1">
                            <input 
                              type="text" 
                              value={newComment}
                              onChange={(e) => setNewComment(e.target.value)}
                              placeholder="Write a message to the dispatch crew..."
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            <button 
                              onClick={() => handleAddComment(selectedComplaint.id)}
                              disabled={!newComment.trim() || isSubmittingComment}
                              className="bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs px-3 py-2 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              Send
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Report (Citizen Reporting Wizard Form with Gemini Vision analysis) */}
            {activeTab === 'report' && (
              <div className="max-w-2xl mx-auto border border-slate-200 bg-white p-6 sm:p-8 rounded-2xl shadow-sm space-y-8 animate-in fade-in duration-300 text-left">
                
                {/* Form header */}
                <div className="border-b border-slate-150 pb-5">
                  <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" />
                    New AI-Powered Waste Report
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">Upload an image of the overflowing container or litter heap. Our model automatically identifies materials and environmental risk score.</p>
                </div>

                {/* Progress Indicators */}
                <div className="flex justify-between items-center text-[11px] font-mono">
                  <span className={`pb-1 border-b-2 ${reportingStep === 1 ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-slate-200 text-slate-400'}`}>01. Snap / Upload & Analyze</span>
                  <span className="text-slate-300">➜</span>
                  <span className={`pb-1 border-b-2 ${reportingStep === 2 ? 'border-emerald-600 text-emerald-700 font-bold' : 'border-slate-200 text-slate-400'}`}>02. Pin GPS & Submit Report</span>
                </div>

                {/* Step 1: Upload and Analyze */}
                {reportingStep === 1 && (
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">1. Attach Incident Photo (Litter Pile, Clogged Sewer, Overflowing Bin)</label>
                      
                      {!selectedImage ? (
                        <div className="border-2 border-dashed border-slate-200 rounded-xl hover:border-emerald-500 transition-all cursor-pointer p-10 text-center space-y-3.5 relative bg-slate-50/50">
                          <input 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 opacity-0 cursor-pointer"
                          />
                          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mx-auto border border-slate-200">
                            <Upload className="w-6 h-6" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-800">Drag & drop or click to upload</p>
                            <p className="text-[10px] text-slate-400 mt-1">Supports PNG, JPG, WebP. High clarity recommended for AI accuracy.</p>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="aspect-video w-full rounded-xl overflow-hidden relative border border-slate-200 bg-slate-50">
                            <img 
                              src={selectedImage} 
                              alt="Uploaded waste" 
                              className="w-full h-full object-contain"
                              referrerPolicy="no-referrer"
                            />
                            <button 
                              onClick={() => setSelectedImage(null)}
                              className="absolute top-3 right-3 bg-slate-900/80 hover:bg-slate-900 text-white p-1.5 rounded-lg text-xs transition-all cursor-pointer"
                            >
                              Remove ✕
                            </button>
                          </div>
                          <p className="text-[10px] text-slate-400 text-center">Base64 photo encoding secured.</p>
                        </div>
                      )}
                    </div>

                    {analysisError && (
                      <div className="text-xs text-rose-600 bg-rose-50 border border-rose-100 rounded-xl p-3 flex items-start gap-2">
                        <span className="font-bold">Analysis Failed:</span> {analysisError}
                      </div>
                    )}

                    <div className="pt-4 border-t border-slate-150 flex justify-end">
                      <button 
                        onClick={handleAnalyzeImage}
                        disabled={!selectedImage || isAnalyzing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm px-6 py-3 rounded-xl transition-all shadow-md shadow-emerald-600/10 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                      >
                        {isAnalyzing ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            EcoBot Analyzing Image...
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
                            Analyze Image with Gemini
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Step 2: Location and Submit */}
                {reportingStep === 2 && aiResult && (
                  <div className="space-y-6">
                    {/* AI Diagnostics Box */}
                    <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 space-y-4">
                      <div className="flex justify-between items-center border-b border-emerald-200 pb-2">
                        <span className="text-xs font-mono text-emerald-800 font-bold flex items-center gap-1">
                          <Sparkles className="w-3.5 h-3.5 text-amber-500" /> AI CLASSIFICATION REPORT
                        </span>
                        <span className="text-[10px] bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded text-emerald-800 font-semibold">
                          {aiResult.confidence}% confidence
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-500">Classified Waste Category:</span>
                          <span className="font-bold text-slate-900 block text-sm mt-0.5">{aiResult.wasteType}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Assessed Eco Severity Score:</span>
                          <span className="font-bold text-rose-700 block text-sm mt-0.5 font-mono">{aiResult.severity} / 10</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Recommended Urgency:</span>
                          <span className="font-bold text-slate-800 block text-sm mt-0.5">{aiResult.priority} Priority</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Cleanliness Rating:</span>
                          <span className="font-bold text-teal-800 block text-sm mt-0.5">{aiResult.cleanlinessRating}</span>
                        </div>
                      </div>

                      <div className="space-y-2 text-xs pt-2 border-t border-emerald-150 leading-normal text-slate-700">
                        <p><span className="font-semibold text-slate-900">Suggested Action Plan:</span> {aiResult.recommendation}</p>
                        <p><span className="font-semibold text-slate-900">Environmental Danger:</span> {aiResult.environmentalImpact}</p>
                      </div>
                    </div>

                    {/* GPS Location selector */}
                    <div className="space-y-3">
                      <label className="text-xs font-semibold text-slate-700 block">2. Report Location Address & Coordinates</label>
                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3 text-xs leading-normal">
                        <div className="flex items-center gap-2 text-emerald-700 font-bold">
                          <MapPin className="w-4 h-4" />
                          <span>Locked Coordinates: Lat {manualCoords?.lat || 19.0760}, Lng {manualCoords?.lng || 72.8777}</span>
                        </div>
                        
                        <div className="space-y-1 relative" ref={autocompleteRef}>
                          <span className="text-slate-400 block text-[10px] font-bold">VERIFIED STREET ADDRESS (AUTOCOMPLETE)</span>
                          <div className="relative">
                            <input 
                              type="text" 
                              value={manualCoords?.address || ''}
                              onChange={(e) => handleAddressChange(e.target.value)}
                              onFocus={() => {
                                if (manualCoords?.address && manualCoords.address.trim().length >= 3) {
                                  setShowSuggestionDropdown(true);
                                }
                              }}
                              placeholder="Type address (e.g. Kurla Mumbai, Sion Bandra...)"
                              className="w-full bg-white border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                            />
                            {isFetchingSuggestions && (
                              <div className="absolute right-2 top-2.5">
                                <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
                              </div>
                            )}
                          </div>

                          {showSuggestionDropdown && addressSuggestions.length > 0 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl z-50 max-h-48 overflow-y-auto divide-y divide-slate-100">
                              {addressSuggestions.map((suggestion, index) => (
                                <button
                                  key={suggestion.id || index}
                                  type="button"
                                  onClick={() => handleSelectSuggestion(suggestion)}
                                  className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer text-slate-700 block truncate"
                                >
                                  {suggestion.place_name}
                                </button>
                              ))}
                            </div>
                          )}
                          {showSuggestionDropdown && !isFetchingSuggestions && addressSuggestions.length === 0 && (manualCoords?.address || '').trim().length >= 3 && (
                            <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-slate-200 rounded-lg p-2 shadow-xl z-50 text-[10px] text-slate-400 text-center">
                              No matching places found in India.
                            </div>
                          )}
                        </div>

                        <div className="mt-4 w-full relative">
                          <div className="absolute top-2 left-2 z-20 bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg border border-slate-200 text-[10px] font-bold text-slate-600 shadow-sm">
                            Click to pin location
                          </div>
                          <MapContainer 
                            complaints={manualCoords ? [{
                              id: 'temp_report',
                              citizenId: 'temp',
                              citizenName: 'You',
                              imageUrl: selectedImage || '',
                              description: 'Selected Report Location',
                              wasteType: aiResult?.wasteType || 'Trash',
                              confidence: 100,
                              severity: 5,
                              priority: 'Medium',
                              cleanlinessRating: 'Poor',
                              environmentalImpact: '',
                              recommendation: '',
                              lat: manualCoords.lat,
                              lng: manualCoords.lng,
                              address: manualCoords.address,
                              status: 'pending',
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString()
                            }] : []}
                            selectedComplaintId="temp_report"
                            className="relative w-full h-64 rounded-xl overflow-hidden glass-card shadow-sm border border-slate-200 bg-white"
                            onSelectCoordinates={(lat, lng, address) => setManualCoords({ lat, lng, address: address || 'Mumbai, India' })}
                          />
                        </div>

                        <p className="text-[10px] text-slate-400 leading-normal">
                          🎯 Tip: Need custom coordinates? You can select pins manually by clicking anywhere on the map above, or edit the address line.
                        </p>
                      </div>
                    </div>

                    {/* Description field */}
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-slate-700 block">3. Add Additional Context / Landmarks (Optional)</label>
                      <textarea 
                        rows={2}
                        value={customDescription}
                        onChange={(e) => setCustomDescription(e.target.value)}
                        placeholder="e.g. Next to public school gates, blocking water drain, organic materials are spilling out..."
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    {/* Action buttons */}
                    <div className="pt-4 border-t border-slate-150 flex justify-between">
                      <button 
                        onClick={() => setReportingStep(1)}
                        className="bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-700 font-bold text-xs px-4 py-2.5 rounded-lg transition-all cursor-pointer"
                      >
                        Back
                      </button>
                      <button 
                        onClick={handleSubmitReport}
                        disabled={isSubmittingReport}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-6 py-2.5 rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        {isSubmittingReport ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" /> Publishing...
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4" /> Submit Report (+20 XP Points)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Leaderboard */}
            {activeTab === 'leaderboard' && (
              <div className="max-w-xl mx-auto space-y-6 text-left animate-in fade-in duration-300">
                <div className="text-center space-y-2">
                  <Trophy className="w-12 h-12 text-amber-500 mx-auto animate-bounce" />
                  <h3 className="text-lg font-black text-slate-900 uppercase tracking-wider font-mono">Civic Conservation Leaderboard</h3>
                  <p className="text-xs text-slate-500">Top-performing citizens logging reports and keeping the community green.</p>
                </div>

                <div className="bg-white border border-slate-200 rounded-2xl p-4 overflow-hidden shadow-xs">
                  {isLoadingLeaderboard ? (
                    <div className="text-center py-12 text-slate-400 text-xs gap-2 flex items-center justify-center">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-500" /> Fetching latest standings...
                    </div>
                  ) : leaderboard.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs">No entries on the leaderboard. Submit reports to claim your space!</div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {leaderboard.map((lead, idx) => {
                        const isGold = lead.rank === 1;
                        const isSilver = lead.rank === 2;
                        const isBronze = lead.rank === 3;
                        const isCurrentUser = lead.uid === user?.uid;

                        return (
                          <div 
                            key={lead.uid} 
                            className={`flex justify-between items-center py-3.5 px-2 transition-colors ${isCurrentUser ? 'bg-emerald-50/40 border-l-4 border-emerald-500 rounded-r-lg' : ''}`}
                          >
                            <div className="flex items-center gap-3">
                              {/* Rank Indicator */}
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-bold ${
                                isGold ? 'bg-amber-100 text-amber-800 border border-amber-200' : (
                                  isSilver ? 'bg-slate-100 text-slate-700 border border-slate-200' : (
                                    isBronze ? 'bg-orange-100 text-orange-800 border border-orange-200' : 'text-slate-400'
                                  )
                                )
                              }`}>
                                {lead.rank}
                              </span>

                              {/* Avatar */}
                              <img 
                                src={lead.avatar} 
                                alt={lead.name} 
                                className="w-8 h-8 rounded-lg object-cover bg-slate-100 border border-slate-200"
                                referrerPolicy="no-referrer"
                              />

                              {/* Name */}
                              <div>
                                <span className="text-xs font-bold text-slate-900 block">{lead.name} {isCurrentUser && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-normal">YOU</span>}</span>
                                <span className="text-[9px] text-slate-500">Citizen Advocate</span>
                              </div>
                            </div>

                            {/* Score Points */}
                            <div className="text-right">
                              <span className="font-mono text-xs font-bold text-emerald-700">{lead.points} XP</span>
                              <span className="text-[9px] text-slate-400 block">Points</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            3. ADMIN DASHBOARD VIEW
            ======================================================== */}
        {currentView === 'admin' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Admin Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6 text-left">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <ShieldAlert className="w-6 h-6 text-emerald-600" />
                  Municipal Admin Desk
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">Prioritize complaints, assign cleaning divisions, and track live spatial heatmaps.</p>
              </div>
              <button 
                onClick={() => {
                  fetchComplaints();
                  fetchAnalytics();
                }}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 active:scale-95 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Reload Stats
              </button>
            </div>

            {/* Quick Summary Widgets */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1 text-left">
                  <span className="text-slate-450 font-mono text-[10px] uppercase font-bold">Active Incidents</span>
                  <div className="text-2xl font-black text-slate-900">{analytics?.total || complaints.length}</div>
                </div>
                <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-600"><Activity className="w-5 h-5" /></div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1 text-left">
                  <span className="text-slate-450 font-mono text-[10px] uppercase font-bold">Pending Sweep</span>
                  <div className="text-2xl font-black text-rose-600">{analytics?.pending ?? complaints.filter(c => c.status === 'pending').length}</div>
                </div>
                <div className="w-10 h-10 bg-rose-50 border border-rose-100/50 rounded-xl flex items-center justify-center text-rose-600"><Clock className="w-5 h-5" /></div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1 text-left">
                  <span className="text-slate-450 font-mono text-[10px] uppercase font-bold">Crews Dispatched</span>
                  <div className="text-2xl font-black text-sky-650">{analytics?.assigned ?? complaints.filter(c => c.status === 'assigned').length}</div>
                </div>
                <div className="w-10 h-10 bg-sky-50 border border-sky-100/50 rounded-xl flex items-center justify-center text-sky-600"><Users className="w-5 h-5" /></div>
              </div>

              <div className="bg-white border border-slate-200 p-5 rounded-2xl flex items-center justify-between shadow-xs">
                <div className="space-y-1 text-left">
                  <span className="text-slate-450 font-mono text-[10px] uppercase font-bold">Resolved Total</span>
                  <div className="text-2xl font-black text-emerald-600">{analytics?.resolved ?? complaints.filter(c => c.status === 'resolved').length}</div>
                </div>
                <div className="w-10 h-10 bg-emerald-50 border border-emerald-100/50 rounded-xl flex items-center justify-center text-emerald-600"><CheckCircle className="w-5 h-5" /></div>
              </div>
            </div>

            {/* Geographical Map Heatmap + Active Incidents Panel */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-8 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Live Spatial Map</h3>
                  <span className="text-[10px] text-slate-400">Toggle "Heatmap" overlay to view high concentration pollution zones</span>
                </div>
                <MapContainer 
                  complaints={complaints} 
                  crews={crews}
                  onSelectComplaint={(c) => setAdminSelectedComplaint(c)}
                  selectedComplaintId={adminSelectedComplaint?.id}
                />
              </div>

              <div className="lg:col-span-4 space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">AI Priority Incident Pipeline</h3>
                  <span className="text-[10px] text-slate-400 font-mono">Sort: High Severity first</span>
                </div>

                <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1 text-left" style={{ scrollbarWidth: 'thin' }}>
                  {/* Sorting High Severity First */}
                  {complaints.length === 0 ? (
                    <div className="text-center py-20 text-slate-400 text-xs">No complaints logged yet in the city.</div>
                  ) : (
                    [...complaints]
                      .sort((a, b) => b.severity - a.severity)
                      .map(comp => (
                        <div 
                          key={comp.id}
                          onClick={() => setAdminSelectedComplaint(comp)}
                          className={`border rounded-xl p-3 cursor-pointer transition-all ${adminSelectedComplaint?.id === comp.id ? 'bg-white border-emerald-500 shadow-md ring-2 ring-emerald-500/15' : 'bg-white border-slate-200 hover:border-slate-350 shadow-xs'}`}
                        >
                          <div className="flex gap-3">
                            <img 
                              src={comp.imageUrl} 
                              alt="Trash pile" 
                              className="w-12 h-12 rounded-lg object-cover bg-slate-100 flex-shrink-0 border border-slate-200"
                              referrerPolicy="no-referrer"
                            />
                            <div className="flex-1 min-w-0 text-left">
                              <div className="flex justify-between items-center gap-1.5">
                                <span className="font-bold text-xs text-slate-900 truncate block">{comp.wasteType} Waste</span>
                                <span className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                  comp.severity >= 8 ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  Sev: {comp.severity}/10
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 truncate mt-0.5">{comp.address}</p>
                              <div className="flex justify-between items-center text-[9px] text-slate-400 font-mono mt-1">
                                <span>Priority: <span className="font-semibold text-slate-700">{comp.priority}</span></span>
                                <span>Status: <span className="font-bold text-emerald-700">{comp.status.toUpperCase()}</span></span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>

            {/* Admin detailed control panel */}
            {adminSelectedComplaint && (
              <div className="border border-slate-200 bg-white rounded-2xl p-6 shadow-lg animate-in slide-in-from-bottom-5 duration-300 text-left space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2.5 py-0.5 rounded-full border ${
                        adminSelectedComplaint.status === 'resolved' 
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
                          : adminSelectedComplaint.status === 'assigned'
                          ? 'bg-sky-100 text-sky-850 border-sky-200'
                          : 'bg-amber-100 text-amber-850 border-amber-200'
                      }`}>
                        {adminSelectedComplaint.status.toUpperCase()}
                      </span>
                      <span className="text-xs text-slate-450 font-mono">{new Date(adminSelectedComplaint.createdAt).toLocaleString()}</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 mt-1.5">Dispatch & Management Control Center</h3>
                    <p className="text-xs text-slate-500 font-normal">Incident address: {adminSelectedComplaint.address}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => triggerPDFDownload(adminSelectedComplaint)}
                      className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 text-slate-750 text-xs px-3 py-1.5 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF Copy
                    </button>
                    <button onClick={() => setAdminSelectedComplaint(null)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  <div className="lg:col-span-4 space-y-4">
                    <img 
                      src={adminSelectedComplaint.imageUrl} 
                      alt="Incident photo" 
                      className="w-full h-48 rounded-xl object-cover border border-slate-200 bg-slate-50 shadow-xs"
                      referrerPolicy="no-referrer"
                    />

                    {/* Admin Actions Panel */}
                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-4">
                      <span className="text-xs font-bold text-slate-800 block uppercase tracking-wider font-mono">Dispatch Actions</span>
                      
                      {adminSelectedComplaint.status === 'pending' && (
                        <div className="space-y-3">
                          <label className="text-[10px] font-mono text-slate-500 block uppercase font-bold">Assign Cleaning squad</label>
                          <div className="flex gap-2">
                            <select 
                              value={assignee}
                              onChange={(e) => setAssignee(e.target.value)}
                              className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-emerald-500"
                            >
                              <option value="">-- Select Crew --</option>
                              {crews.map((crew, cIdx) => (
                                <option key={cIdx} value={crew.name}>{crew.name}</option>
                              ))}
                            </select>
                            <button 
                              onClick={() => handleAssignComplaint(adminSelectedComplaint.id)}
                              disabled={!assignee}
                              className="bg-emerald-600 hover:bg-emerald-750 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg transition-all disabled:opacity-50 cursor-pointer"
                            >
                              Route Team
                            </button>
                          </div>
                        </div>
                      )}

                      {adminSelectedComplaint.status === 'assigned' && (
                        <div className="space-y-2">
                          <div className="text-[10px] font-mono text-slate-500 uppercase font-bold">Assigned Squad</div>
                          <div className="text-xs font-bold text-slate-800">{adminSelectedComplaint.assignedTo}</div>
                          <button 
                            onClick={() => handleResolveComplaint(adminSelectedComplaint.id)}
                            className="w-full bg-emerald-600 hover:bg-emerald-750 text-white font-bold text-xs py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" /> Mark Complaint as Resolved
                          </button>
                        </div>
                      )}

                      {adminSelectedComplaint.status === 'resolved' && (
                        <div className="text-xs text-center py-2 text-emerald-800 font-bold flex items-center justify-center gap-1 bg-emerald-100/50 rounded border border-emerald-200">
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600" /> Incident cleared & closed.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="lg:col-span-8 space-y-6">
                    {/* Gemini diagnostics references */}
                    <div className="bg-emerald-50 border border-emerald-150 p-4 rounded-xl space-y-2 text-xs">
                      <span className="font-bold text-emerald-800 flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                        Incident Gemini AI Diagnosis Summary
                      </span>
                      <p className="text-emerald-950 italic leading-relaxed">
                        "Waste verified as {adminSelectedComplaint.wasteType.toLowerCase()} material with {adminSelectedComplaint.confidence}% AI confidence. Severity estimated as {adminSelectedComplaint.severity}/10. Priority level set to {adminSelectedComplaint.priority}."
                      </p>
                      <p className="text-slate-500 mt-2 font-bold">Gemini Suggested Collector Plan:</p>
                      <p className="text-slate-700 font-normal">{adminSelectedComplaint.recommendation}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs leading-normal">
                      <div>
                        <span className="font-semibold text-slate-500 block mb-1">Environmental Hazard Description</span>
                        <p className="text-slate-700">{adminSelectedComplaint.environmentalImpact}</p>
                      </div>
                      <div>
                        <span className="font-semibold text-slate-500 block mb-1">Citizen's Description & Landmarks</span>
                        <p className="text-slate-700 italic">"{adminSelectedComplaint.description}"</p>
                      </div>
                    </div>

                    {/* Admin internal logs / communication feed */}
                    <div className="border-t border-slate-150 pt-5 space-y-3.5">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider font-mono">Municipal Comm Feed</h4>
                      <div className="space-y-2.5 max-h-40 overflow-y-auto">
                        {(adminSelectedComplaint.comments || []).length === 0 ? (
                          <p className="text-[11px] text-slate-400 italic">No communication logs recorded yet.</p>
                        ) : (
                          adminSelectedComplaint.comments!.map((com, comIdx) => (
                            <div key={comIdx} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-xs">
                              <div className="flex justify-between text-[10px] text-slate-500 mb-1">
                                <span className="font-semibold text-emerald-700">{com.userName} ({com.userRole === 'admin' ? 'Municipal Lead' : 'Citizen'})</span>
                                <span>{new Date(com.createdAt).toLocaleString()}</span>
                              </div>
                              <p className="text-slate-700 leading-normal">{com.text}</p>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Write comment */}
                      <div className="flex gap-2 items-center pt-1">
                        <input 
                          type="text" 
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Log an internal dispatch update comment..."
                          className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                        <button 
                          onClick={() => handleAddComment(adminSelectedComplaint.id)}
                          disabled={!newComment.trim() || isSubmittingComment}
                          className="bg-slate-800 hover:bg-slate-750 text-white font-semibold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                        >
                          Send Log
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Municipal Clean-up Crews & Fleet Dispatch Section */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs text-left space-y-6">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5.5 h-5.5 text-emerald-600" />
                  Municipal Crew Register & Dispatch Control
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Register new specialty sanitation squads, track active city units, and visualize their live fleet status.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left side: Registered Crews Fleet (7 cols) */}
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">Active Fleet Registry ({crews.length} Units)</span>
                    <span className="text-[10px] text-slate-400 font-mono">All locations referenced in Mumbai, India</span>
                  </div>

                  {isLoadingCrews ? (
                    <div className="text-center py-12 text-slate-400 text-xs flex items-center justify-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-emerald-600" /> Retrieving live squads...
                    </div>
                  ) : crews.length === 0 ? (
                    <div className="text-center py-12 text-slate-400 text-xs italic bg-slate-50 border border-dashed border-slate-200 rounded-xl">
                      No active crews found. Use the quick registration form to deploy municipal squads.
                    </div>
                  ) : (
                    <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
                      {crews.map((crew, idx) => {
                        const activeTask = complaints.find(c => c.id === crew.assignedComplaintId);
                        return (
                          <div key={idx} className="bg-slate-50 border border-slate-150 rounded-xl p-3.5 hover:shadow-xs transition-all">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                              <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                                  <Users className="w-4 h-4 text-emerald-600" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-xs text-slate-900">{crew.name}</h4>
                                  <span className="text-[10px] text-slate-400 font-mono">
                                    GPS: {crew.lat.toFixed(5)}, {crew.lng.toFixed(5)}
                                  </span>
                                </div>
                              </div>

                              {/* Status Update Dropdown for Admin */}
                              <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-400 font-mono font-bold uppercase">Change Status:</span>
                                <select
                                  value={crew.status}
                                  onChange={async (e) => {
                                    await handleUpdateCrew(
                                      crew.name,
                                      crew.lat,
                                      crew.lng,
                                      e.target.value as any,
                                      crew.assignedComplaintId
                                    );
                                  }}
                                  className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg uppercase border focus:outline-none cursor-pointer ${
                                    crew.status === 'active_cleaning'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200 focus:ring-1 focus:ring-rose-400'
                                      : crew.status === 'on_route'
                                      ? 'bg-amber-50 text-amber-700 border-amber-200 focus:ring-1 focus:ring-amber-400'
                                      : 'bg-emerald-50 text-emerald-700 border-emerald-200 focus:ring-1 focus:ring-emerald-400'
                                  }`}
                                >
                                  <option value="idle">Idle</option>
                                  <option value="on_route">On Route</option>
                                  <option value="active_cleaning">Cleaning</option>
                                </select>
                              </div>
                            </div>

                            {/* Assigned tasks sub info */}
                            <div className="mt-2.5 pt-2.5 border-t border-slate-200/50 flex items-start gap-1.5 text-[11px] text-slate-600">
                              <span className="font-bold text-slate-500 font-mono uppercase text-[9px] tracking-wider mt-0.5">Mission:</span>
                              <div className="flex-1">
                                {activeTask ? (
                                  <span>
                                    Cleaning <strong className="text-slate-800 font-semibold">{activeTask.wasteType} Waste</strong> at <span className="text-slate-500">{activeTask.address}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 italic">No task assigned. Idle in municipal sector.</span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Right side: Register/Add Crew Form (5 cols) */}
                <div className="lg:col-span-5 bg-slate-50/50 border border-slate-200/60 rounded-xl p-5 space-y-4">
                  <div className="border-b border-slate-100 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider font-mono flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-emerald-600" />
                      Register New Squad Division
                    </span>
                  </div>

                  <form onSubmit={handleAdminAddCrew} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Squad Division Name</label>
                      <input
                        required
                        type="text"
                        value={newCrewName}
                        onChange={(e) => setNewCrewName(e.target.value)}
                        placeholder="e.g. Bandra Eco-Sweepers"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Base Latitude</label>
                        <input
                          required
                          type="text"
                          value={newCrewLat}
                          onChange={(e) => setNewCrewLat(e.target.value)}
                          placeholder="e.g. 19.0760"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Base Longitude</label>
                        <input
                          required
                          type="text"
                          value={newCrewLng}
                          onChange={(e) => setNewCrewLng(e.target.value)}
                          placeholder="e.g. 72.8777"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleRandomizeNewCrewCoords}
                        className="flex-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 font-bold text-[10px] py-1.5 rounded-lg transition-colors cursor-pointer text-center"
                      >
                        📍 Quick GPS-Scatter
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setNewCrewLat('19.0760');
                          setNewCrewLng('72.8777');
                        }}
                        className="bg-white hover:bg-slate-100 text-slate-500 border border-slate-200 font-bold text-[10px] px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer text-center"
                      >
                        Reset GPS
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-mono text-slate-500 uppercase font-bold block">Initial Mission Status</label>
                      <select
                        value={newCrewStatus}
                        onChange={(e) => setNewCrewStatus(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                      >
                        <option value="idle">Idle (Awaiting Assignment)</option>
                        <option value="on_route">On Route</option>
                        <option value="active_cleaning">Active Cleaning</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      disabled={isAddingCrew}
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2.5 rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      {isAddingCrew ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Registering...
                        </>
                      ) : (
                        <>
                          <Plus className="w-3.5 h-3.5" /> Deploy Squad Division
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>
            </div>

            {/* Analytics & Recharts Graphs dashboard section */}
            <div className="space-y-6 pt-6 border-t border-slate-200">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono text-left">Analytics Insights & Charts</h3>
              
              {isLoadingAnalytics ? (
                <div className="text-center py-16 text-slate-400 text-xs gap-2 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin text-emerald-600" /> Gathering city aggregates...
                </div>
              ) : analytics ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-left text-xs text-slate-600">
                  {/* Chart 1: Daily/Weekly timelines */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                    <span className="font-bold text-slate-900 block font-mono uppercase tracking-wider text-[11px]">7-Day Timeline: Reported vs Resolved Incidents</span>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.timeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#64748b" fontSize={10} />
                          <YAxis stroke="#64748b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: 10, color: '#0f172a' }} />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Line type="monotone" dataKey="reported" stroke="#ef4444" name="Reported" activeDot={{ r: 8 }} strokeWidth={2} />
                          <Line type="monotone" dataKey="resolved" stroke="#10b981" name="Resolved" strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 2: Material types pie chart */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                    <span className="font-bold text-slate-900 block font-mono uppercase tracking-wider text-[11px]">Waste Classification Breakdowns</span>
                    <div className="h-64 flex items-center justify-center">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={analytics.wasteTypes}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                            fontSize={10}
                          >
                            {analytics.wasteTypes.map((entry: any, index: number) => {
                              const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#06b6d4'];
                              return <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />;
                            })}
                          </Pie>
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: 10, color: '#0f172a' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Chart 3: Most polluted areas / Hotspots */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl space-y-4 shadow-xs">
                    <span className="font-bold text-slate-900 block font-mono uppercase tracking-wider text-[11px]">Most Polluted Streets / Areas</span>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.areaPollution}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="name" stroke="#64748b" fontSize={9} />
                          <YAxis stroke="#64748b" fontSize={10} />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', fontSize: 10, color: '#0f172a' }} />
                          <Bar dataKey="count" fill="#3b82f6" name="Reports" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Clean up stats list summary */}
                  <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col justify-between shadow-xs">
                    <div>
                      <span className="font-bold text-slate-900 block font-mono uppercase tracking-wider text-[11px] mb-4">Eco Efficiency Performance Dashboard</span>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-slate-500">Total City Incidents</span>
                          <span className="font-bold text-slate-900 font-mono">{analytics.total}</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-slate-500">Average Incident Severity</span>
                          <span className="font-bold text-rose-600 font-mono">{analytics.avgSeverity} / 10</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                          <span className="text-slate-500">Cleansing Efficiency</span>
                          <span className="font-bold text-emerald-600 font-mono">{analytics.resolvedPercentage}%</span>
                        </div>
                        <div className="flex justify-between items-center pb-2">
                          <span className="text-slate-500">Active Cleaning crews</span>
                          <span className="font-bold text-slate-700 font-mono">{crews.filter(c => c.status === 'active_cleaning').length} Squads active</span>
                        </div>
                      </div>
                    </div>
                    <div className="bg-emerald-50 border border-emerald-150 p-3.5 rounded-xl text-[11px] leading-relaxed text-emerald-950 mt-4 text-left">
                      💡 <span className="font-bold text-emerald-800">Eco Insight:</span> Proper waste management and real-time monitoring help maintain a cleaner environment for everyone.
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-400 text-xs">Analytics metrics unavailable. Click "Reload Stats" once database has entries.</div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================
            4. CLEANING CREW PORTAL VIEW
            ======================================================== */}
        {currentView === 'crew' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            {/* Crew Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6 text-left">
              <div>
                <h2 className="text-2xl font-black text-slate-900 flex items-center gap-2">
                  <Truck className="w-6 h-6 text-cyan-600" />
                  Cleaning Crew Workspace
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 font-sans">Report location telemetry, manage squad dispatches, and log clean-up accomplishments.</p>
              </div>
              <button 
                onClick={() => {
                  fetchCrews();
                  fetchComplaints();
                }}
                className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-bold text-xs px-4 py-2 rounded-xl transition-all flex items-center gap-2 active:scale-95 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Terminal
              </button>
            </div>

            {/* If no squad selected */}
            {!selectedCrewName ? (
              <div className="max-w-2xl mx-auto bg-white border border-slate-200 rounded-3xl p-8 shadow-xl text-center space-y-6 animate-in zoom-in duration-300">
                <div className="w-16 h-16 rounded-2xl bg-cyan-50 border border-cyan-150 flex items-center justify-center text-cyan-600 mx-auto">
                  <Compass className="w-8 h-8 animate-pulse" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-slate-900 font-sans">Initialize Live Operator Telemetry</h3>
                  <p className="text-xs text-slate-500 max-w-md mx-auto">Select your municipal clean-up squad division to register your workspace terminal and stream live geographic coordinates to City Admins.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left max-w-lg mx-auto">
                  {crews.map((existingCrew) => (
                      <button
                        key={existingCrew.name}
                        onClick={() => {
                          setSelectedCrewName(existingCrew.name);
                          const lat = existingCrew?.lat || 19.0760 + (Math.random() - 0.5) * 0.03;
                          const lng = existingCrew?.lng || 72.8777 + (Math.random() - 0.5) * 0.03;
                          const status = existingCrew?.status || 'idle';
                          handleUpdateCrew(existingCrew.name, lat, lng, status, existingCrew?.assignedComplaintId);
                        }}
                        className="p-4 border border-slate-200 hover:border-cyan-500 rounded-2xl text-left hover:bg-cyan-50/25 transition-all group flex items-start gap-3 active:scale-98 shadow-xs cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-cyan-100 flex items-center justify-center text-slate-500 group-hover:text-cyan-600 font-bold transition-all shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-900 block truncate group-hover:text-cyan-700">{existingCrew.name}</span>
                          <span className="text-[10px] text-slate-400 mt-0.5 block font-sans">
                            {existingCrew 
                              ? `Live: ${existingCrew.status.toUpperCase()} (${existingCrew.lat.toFixed(3)}, ${existingCrew.lng.toFixed(3)})` 
                              : 'Status: Offline (Tap to register)'}
                          </span>
                        </div>
                      </button>
                    ))}
                </div>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const newName = form.crewName.value.trim();
                  if (newName && !crews.find(c => c.name.toLowerCase() === newName.toLowerCase())) {
                    setSelectedCrewName(newName);
                    handleUpdateCrew(newName, 19.0760, 72.8777, 'idle');
                  } else if (crews.find(c => c.name.toLowerCase() === newName.toLowerCase())) {
                    alert('Crew already exists, please click on it above.');
                  }
                }} className="max-w-lg mx-auto flex gap-2 mt-4">
                  <input required name="crewName" placeholder="Register New Squad Name" className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500" />
                  <button type="submit" className="bg-cyan-600 text-white px-4 py-3 rounded-xl font-bold hover:bg-cyan-700">Register</button>
                </form>
              </div>
            ) : (
              // Active Crew Terminal
              <div className="space-y-8 text-left">
                {/* Active Crew Workspace Details */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Status Card */}
                  {(() => {
                    const currentCrew = crews.find(c => c.name === selectedCrewName) || {
                      name: selectedCrewName,
                      lat: 19.0760,
                      lng: 72.8777,
                      status: 'idle',
                      assignedComplaintId: ''
                    };

                    const activeComplaint = complaints.find(c => c.id === currentCrew.assignedComplaintId);

                    // Quick simulator handler
                    const handleStatusChange = async (newStatus: 'idle' | 'on_route' | 'active_cleaning') => {
                      await handleUpdateCrew(
                        currentCrew.name,
                        currentCrew.lat,
                        currentCrew.lng,
                        newStatus,
                        currentCrew.assignedComplaintId
                      );
                    };

                    const handleGPSMovement = async () => {
                      // Slight crawl towards the assigned complaint if any, otherwise random step
                      let targetLat = currentCrew.lat;
                      let targetLng = currentCrew.lng;

                      if (activeComplaint) {
                        // Crawl 35% of the way towards target
                        targetLat = currentCrew.lat + (activeComplaint.lat - currentCrew.lat) * 0.35;
                        targetLng = currentCrew.lng + (activeComplaint.lng - currentCrew.lng) * 0.35;
                      } else {
                        // Random walk
                        targetLat = currentCrew.lat + (Math.random() - 0.5) * 0.008;
                        targetLng = currentCrew.lng + (Math.random() - 0.5) * 0.008;
                      }

                      await handleUpdateCrew(
                        currentCrew.name,
                        targetLat,
                        targetLng,
                        currentCrew.status,
                        currentCrew.assignedComplaintId
                      );
                    };

                    const handleResolveIncident = async () => {
                      if (!activeComplaint) return;
                      // Update complaint
                      try {
                        const res = await fetch(`/api/complaints/${activeComplaint.id}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            status: 'resolved',
                            comment: `Successfully sweeps-cleaned by municipal specialists ${currentCrew.name}.`,
                            userId: 'crew-telemetry',
                            userName: currentCrew.name,
                            userRole: 'admin'
                          })
                        });

                        if (res.ok) {
                          // Update crew to idle and clear assigned complaint
                          await handleUpdateCrew(
                            currentCrew.name,
                            currentCrew.lat,
                            currentCrew.lng,
                            'idle',
                            ''
                          );
                          // Refresh everything
                          await fetchComplaints();
                          await fetchCrews();
                        }
                      } catch (err) {
                        console.error('Failed to resolve complaint:', err);
                      }
                    };

                    return (
                      <>
                        {/* Status Manager */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                          <div className="space-y-1.5 text-left">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Active Terminal Profile</span>
                              <button 
                                onClick={() => setSelectedCrewName('')}
                                className="text-[10px] text-rose-600 hover:text-rose-800 font-bold transition-all cursor-pointer"
                              >
                                Disconnect
                              </button>
                            </div>
                            <h4 className="text-sm font-black text-slate-900 truncate font-sans">{currentCrew.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`w-2.5 h-2.5 rounded-full ${
                                currentCrew.status === 'active_cleaning' 
                                  ? 'bg-cyan-500 animate-ping' 
                                  : currentCrew.status === 'on_route'
                                  ? 'bg-sky-400 animate-pulse'
                                  : 'bg-slate-400'
                              }`}></span>
                              <span className="text-xs font-bold text-slate-700 font-sans">
                                {currentCrew.status === 'active_cleaning' 
                                  ? 'Active Cleansing Operational' 
                                  : currentCrew.status === 'on_route'
                                  ? 'Dispatch En Route' 
                                  : 'Standby / Idle'}
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 border-t border-slate-100 pt-3">
                            <span className="text-[10px] font-mono text-slate-400 uppercase block font-bold">Transmit Status State</span>
                            <div className="grid grid-cols-3 gap-1.5">
                              <button
                                onClick={() => handleStatusChange('idle')}
                                className={`text-[10px] font-bold py-2 px-1 rounded-lg border transition-all cursor-pointer ${
                                  currentCrew.status === 'idle'
                                    ? 'bg-slate-700 border-slate-800 text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Idle
                              </button>
                              <button
                                onClick={() => handleStatusChange('on_route')}
                                className={`text-[10px] font-bold py-2 px-1 rounded-lg border transition-all cursor-pointer ${
                                  currentCrew.status === 'on_route'
                                    ? 'bg-sky-600 border-sky-700 text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                En Route
                              </button>
                              <button
                                onClick={() => handleStatusChange('active_cleaning')}
                                className={`text-[10px] font-bold py-2 px-1 rounded-lg border transition-all cursor-pointer ${
                                  currentCrew.status === 'active_cleaning'
                                    ? 'bg-cyan-600 border-cyan-700 text-white'
                                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                                }`}
                              >
                                Cleaning
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Telemetry Coords */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                          <div className="space-y-2">
                            <span className="text-[10px] font-mono text-slate-400 uppercase font-bold block">Telemetry Stream</span>
                            <div className="space-y-1 bg-slate-900 border border-slate-800 p-3 rounded-xl font-mono text-xs text-slate-200 text-left">
                              <div className="flex justify-between">
                                <span className="text-slate-500">LATITUDE:</span>
                                <span className="text-emerald-400 font-bold">{currentCrew.lat.toFixed(5)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">LONGITUDE:</span>
                                <span className="text-emerald-400 font-bold">{currentCrew.lng.toFixed(5)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-500">SIGNAL:</span>
                                <span className="text-cyan-400 font-bold">100% SAT-GPS</span>
                              </div>
                            </div>
                          </div>

                          <div className="space-y-2 border-t border-slate-100 pt-3">
                            <button
                              onClick={handleGPSMovement}
                              className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-95 cursor-pointer"
                            >
                              <Navigation className="w-3.5 h-3.5" />
                              {activeComplaint ? 'Simulate Truck Movement 🚚' : 'Simulate Random Patrol 🧭'}
                            </button>
                            <p className="text-[10px] text-slate-400 text-center font-sans">
                              Or click anywhere on the live spatial map below to set custom coordinates!
                            </p>
                          </div>
                        </div>

                        {/* Assigned Incident */}
                        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                          {activeComplaint ? (
                            <>
                              <div className="space-y-1 text-left">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-mono text-slate-400 uppercase font-bold">Current Assigned Target</span>
                                  <span className="text-[10px] bg-rose-50 border border-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md font-bold font-mono">SEV: {activeComplaint.severity}</span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 truncate mt-1 font-sans">{activeComplaint.wasteType} Waste Report</h4>
                                <p className="text-[11px] text-slate-500 truncate font-sans">{activeComplaint.address}</p>
                              </div>

                              <button
                                onClick={handleResolveIncident}
                                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-3 rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg cursor-pointer hover:shadow-emerald-600/10 active:scale-95"
                              >
                                <CheckCircle className="w-4 h-4" />
                                Mark Cleaned & Resolve
                              </button>
                            </>
                          ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-center space-y-2 py-4">
                              <span className="text-slate-350 text-2xl">💤</span>
                              <span className="text-xs font-bold text-slate-800 font-sans">No Incidents Dispatched</span>
                              <p className="text-[10px] text-slate-400 max-w-xs leading-normal font-sans">
                                Standard idle state. Ask a City Admin to assign an active garbage complaint pipeline to this squad.
                              </p>
                            </div>
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Grid layout for Map & Assigned Task list */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                  {/* Live Map */}
                  <div className="lg:col-span-8 space-y-3">
                    <div className="flex justify-between items-center text-left">
                      <div>
                        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono">Spatial Telemetry Grid Map</h3>
                        <p className="text-[10px] text-slate-400 font-sans">Click anywhere on the map to manually teleport your vehicle coordinates.</p>
                      </div>
                      <span className="text-[9px] bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded-full border border-cyan-200 font-mono">Interactive Telemetry Active</span>
                    </div>

                    <div className="relative border border-slate-200 bg-white rounded-2xl overflow-hidden p-1 shadow-md">
                      {(() => {
                        const currentCrew = crews.find(c => c.name === selectedCrewName);
                        return (
                          <MapContainer 
                            complaints={complaints}
                            crews={crews}
                            onSelectCoordinates={async (lat, lng) => {
                              if (currentCrew) {
                                await handleUpdateCrew(
                                  currentCrew.name,
                                  lat,
                                  lng,
                                  currentCrew.status,
                                  currentCrew.assignedComplaintId
                                );
                              }
                            }}
                          />
                        );
                      })()}
                    </div>
                  </div>

                  {/* Task list matching current squad */}
                  <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider font-mono text-left">Division Pipeline</h3>
                    <div className="space-y-3.5 max-h-[460px] overflow-y-auto pr-1 text-left" style={{ scrollbarWidth: 'thin' }}>
                      {(() => {
                        const assignedTasks = complaints.filter(c => c.assignedTo === selectedCrewName && c.status !== 'resolved');
                        if (assignedTasks.length === 0) {
                          return (
                            <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs py-20 font-sans">
                              No active cleaning dispatches in your division queue.
                            </div>
                          );
                        }

                        return assignedTasks.map((comp) => {
                          const currentCrew = crews.find(c => c.name === selectedCrewName);
                          const isCurrentlyAssignedTarget = currentCrew?.assignedComplaintId === comp.id;

                          return (
                            <div 
                              key={comp.id}
                              className={`border rounded-xl p-4 bg-white shadow-xs transition-all text-left ${
                                isCurrentlyAssignedTarget 
                                  ? 'border-cyan-500 ring-2 ring-cyan-500/15 shadow-md' 
                                  : 'border-slate-200'
                              }`}
                            >
                              <div className="flex gap-3">
                                <img 
                                  src={comp.imageUrl} 
                                  alt="Litter target" 
                                  className="w-12 h-12 rounded-lg object-cover border border-slate-200 shrink-0"
                                  referrerPolicy="no-referrer"
                                />
                                <div className="flex-1 min-w-0">
                                  <div className="flex justify-between items-center">
                                    <span className="font-bold text-xs text-slate-900 truncate block font-sans">{comp.wasteType} Waste</span>
                                    <span className="text-[10px] text-rose-600 font-bold font-sans">Severity {comp.severity}</span>
                                  </div>
                                  <p className="text-[11px] text-slate-500 truncate mt-0.5 font-sans">{comp.address}</p>
                                  
                                  <div className="flex justify-between items-center mt-3">
                                    <span className="text-[9px] text-slate-450 font-mono">ID: {comp.id}</span>
                                    {!isCurrentlyAssignedTarget ? (
                                      <button
                                        onClick={async () => {
                                          if (currentCrew) {
                                            await handleUpdateCrew(
                                              currentCrew.name,
                                              currentCrew.lat,
                                              currentCrew.lng,
                                              'on_route',
                                              comp.id
                                            );
                                          }
                                        }}
                                        className="bg-cyan-50 hover:bg-cyan-100 text-cyan-700 border border-cyan-200/50 text-[10px] font-bold px-2.5 py-1 rounded-lg transition-all cursor-pointer font-sans"
                                      >
                                        Accept Assignment
                                      </button>
                                    ) : (
                                      <span className="text-[10px] text-cyan-600 font-bold flex items-center gap-1 font-sans">
                                        <span className="w-1.5 h-1.5 bg-cyan-500 rounded-full animate-ping"></span>
                                        Active Target
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Floating Chat Bot Widget (EcoBot AI FAQ assistant) */}
      <ChatBot />

      {/* Auth Entry / Login Modal Panel */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-6">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-7 shadow-2xl space-y-5 animate-in scale-in duration-300 text-left">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  Access Smart City Desk
                </h3>
                <p className="text-xs text-slate-500 mt-1">Choose a role to access the smart city platform.</p>
              </div>
              <button onClick={() => setShowAuthModal(false)} className="text-slate-400 hover:text-slate-600 text-lg cursor-pointer">✕</button>
            </div>
            
            
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-[10.5px] leading-relaxed text-slate-600 mb-4">
              💡 <span className="font-bold text-slate-800">Direct Login:</span> Choose your role below to enter the portal immediately.
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={() => handleAuthSubmit('citizen', 'citizen@smartcity.org')}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                Sign in as Citizen
              </button>
              <button 
                onClick={() => handleAuthSubmit('admin', 'admin@smartcity.org')}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-xl transition-all shadow-md active:scale-98 cursor-pointer flex items-center justify-center gap-2"
              >
                Sign in as Admin
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Universal Footer */}
      <footer className="border-t border-slate-200 bg-white py-8 px-6 text-center text-xs text-slate-500 space-y-2 mt-auto">
        <p>© 2026 Smart Waste Management System. Developed for College SDG 11 Sustainable Cities Research.</p>
        <p className="font-mono text-[10px] text-slate-400">Powered by Google Gemini 2.5 Vision, React 19 & Firebase Firestore</p>
      </footer>

    </div>
  );
}
