import React, { useState, useEffect, useMemo } from 'react';
import { parseFollowUpDate } from './utils/dateParser.js';
import { supabase, supabaseUrl, supabaseAnonKey } from './supabaseClient.js';
import { createClient } from '@supabase/supabase-js';
import { 
  Sun, 
  Phone, 
  Calendar, 
  Search, 
  Users, 
  CheckCircle, 
  Clock, 
  Download, 
  Upload, 
  RefreshCw, 
  Star, 
  MapPin, 
  Mail, 
  Globe, 
  Activity, 
  FileText, 
  X, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Filter,
  Check,
  AlertTriangle,
  LogOut,
  Lock,
  Loader2,
  Menu,
  TrendingUp,
  UserPlus,
  Video
} from 'lucide-react';

// Storage keys for migration fallback
const LOGS_STORAGE_KEY = 'solar_crm_call_logs';
const STATUS_STORAGE_KEY = 'solar_crm_status';

// Helper to parse address and extract state and district
const getVendorLocation = (address) => {
  if (!address) return { state: 'Unknown', district: 'Unknown' };
  
  const addrLower = address.toLowerCase();

  // 1. Identify State
  let state = 'Gujarat'; // Default for this database
  const statesList = [
    { name: 'Maharashtra', keywords: ['maharashtra', 'mumbai', 'pune', 'nagpur', 'thane'] },
    { name: 'Delhi', keywords: ['delhi', 'new delhi', 'ncr'] },
    { name: 'Rajasthan', keywords: ['rajasthan', 'jaipur', 'jodhpur', 'udaipur', 'ajmer'] },
    { name: 'Uttar Pradesh', keywords: ['uttar pradesh', 'up', 'noida', 'lucknow', 'kanpur'] },
    { name: 'Haryana', keywords: ['haryana', 'gurgaon', 'gurugram', 'faridabad'] },
    { name: 'Chhattisgarh', keywords: ['chhattisgarh', 'raipur', 'bilaspur'] },
    { name: 'Goa', keywords: ['goa', 'panaji', 'margao'] },
    { name: 'Punjab', keywords: ['punjab', 'ludhiana', 'amritsar'] },
    { name: 'Bihar', keywords: ['bihar', 'patna'] },
    { name: 'Odisha', keywords: ['odisha', 'bhubaneswar'] },
    { name: 'Kerala', keywords: ['kerala', 'kochi', 'trivandrum'] }
  ];

  for (const s of statesList) {
    if (s.keywords.some(kw => addrLower.includes(kw))) {
      state = s.name;
      break;
    }
  }

  // 2. Identify District/City in Gujarat (or generally)
  let district = 'Other';
  const gujaratDistricts = [
    'Ahmedabad', 'Surat', 'Rajkot', 'Vadodara', 'Bhavnagar', 'Gandhinagar', 'Anand', 'Junagadh', 
    'Jamnagar', 'Mehsana', 'Morbi', 'Amreli', 'Navsari', 'Bharuch', 'Palanpur', 'Banaskantha', 
    'Patan', 'Nadiad', 'Botad', 'Gondal', 'Keshod', 'Kutch', 'Kachchh', 'Valsad', 'Vyara', 
    'Tapi', 'Panchmahal', 'Surendranagar', 'Godhra', 'Vapi', 'Ankleshwar', 'Bhuj', 'Gandhidham',
    'Sanand', 'Deesa', 'Talod', 'Dhoraji', 'Babra', 'Karamsad', 'Padra'
  ];

  for (const dist of gujaratDistricts) {
    const regex = new RegExp('\\b' + dist.toLowerCase() + '\\b', 'i');
    if (regex.test(addrLower)) {
      district = dist === 'Kachchh' ? 'Kutch' : dist;
      break;
    }
  }

  // Fallback for non-Gujarat states' major cities
  if (district === 'Other') {
    if (addrLower.includes('mumbai') || addrLower.includes('andheri')) district = 'Mumbai';
    else if (addrLower.includes('noida')) district = 'Noida';
    else if (addrLower.includes('gurgaon') || addrLower.includes('gurugram')) district = 'Gurugram';
    else if (addrLower.includes('jaipur')) district = 'Jaipur';
  }

  return { state, district };
};



// Clean & format mobile number to launch WhatsApp chat (defaulting to +91 country code for 10 digits)
const getWhatsAppUrl = (mobile) => {
  if (!mobile) return '';
  const cleaned = String(mobile).replace(/\D/g, '');
  if (!cleaned) return '';
  const formatted = cleaned.length === 10 ? `91${cleaned}` : cleaned;
  return `https://wa.me/${formatted}`;
};

// Custom WhatsApp SVG Icon Component
const WhatsAppIcon = ({ size = 16, style = {} }) => (
  <svg 
    viewBox="0 0 24 24" 
    width={size} 
    height={size} 
    style={{ fill: 'currentColor', ...style }}
  >
    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.37 5.054L2 22l5.132-1.347a9.936 9.936 0 0 0 4.877 1.28h.005c5.505 0 9.989-4.478 9.99-9.985A9.972 9.972 0 0 0 12.012 2zm5.703 14.24c-.244.689-1.215 1.254-1.673 1.303-.45.05-1.037.073-1.688-.135-.651-.208-1.503-.532-2.529-.982-4.242-1.859-6.953-6.2-7.165-6.483-.21-.282-1.688-2.247-1.688-4.288 0-2.04 1.057-3.046 1.433-3.456.377-.41.82-.513 1.096-.513.277 0 .553.003.792.012.247.01.579-.093.905.696.326.789 1.114 2.723 1.21 2.923.097.2.163.433.03.699-.133.266-.2.433-.396.666-.195.233-.41.52-.587.697-.197.198-.403.414-.174.808.23.393 1.018 1.677 2.181 2.714 1.498 1.336 2.759 1.748 3.151 1.942.392.195.621.163.851-.103.23-.266.989-1.149 1.25-1.548.261-.399.522-.333.882-.2.36.133 2.285 1.077 2.383 1.144.098.066.163.099.244.233.081.133.081.77-.163 1.459z" />
  </svg>
);

function App() {
  // --- Auth State ---
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [fetchedUserId, setFetchedUserId] = useState(null);

  // --- Navigation & Loading ---
  const [activeTab, setActiveTab] = useState('dashboard'); // 'dashboard' | 'directory' | 'calendar' | 'settings'
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // --- Core Database State ---
  const [vendors, setVendors] = useState([]);
  const [callLogs, setCallLogs] = useState({});
  const [vendorStatuses, setVendorStatuses] = useState({});
  const [snapshots, setSnapshots] = useState([]);
  const [availableDates, setAvailableDates] = useState([]);
  
  // --- Growth Tracker Comparison Range ---
  const [growthStartDate, setGrowthStartDate] = useState('');
  const [growthEndDate, setGrowthEndDate] = useState('');
  
  // --- UI Interactions ---
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [callOutcome, setCallOutcome] = useState('Interested');
  const [callNote, setCallNote] = useState('');
  const [customFollowUpDate, setCustomFollowUpDate] = useState('');
  const [autoDateDetected, setAutoDateDetected] = useState('');

  // --- Directory Filters & Search ---
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [ratingFilter, setRatingFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  const [stateFilter, setStateFilter] = useState('All');
  const [districtFilter, setDistrictFilter] = useState('All');
  const [sortBy, setSortBy] = useState('capacity_difference');
  const [sortOrder, setSortOrder] = useState('desc');

  // --- Dashboard Analytics States ---
  const [dashboardStateSortOrder, setDashboardStateSortOrder] = useState('desc');
  const [dashboardDistrictSortOrder, setDashboardDistrictSortOrder] = useState('desc');
  const [dashboardSelectedState, setDashboardSelectedState] = useState('Gujarat');

  // --- Calendar Navigation ---
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null); // 'YYYY-MM-DD'
  const [demoCalendarDate, setDemoCalendarDate] = useState(new Date());
  const [selectedDemoCalendarDay, setSelectedDemoCalendarDay] = useState(null); // 'YYYY-MM-DD'

  // --- Multi-User & Admin States ---
  const [userRole, setUserRole] = useState('user'); // 'admin' | 'user'
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('user'); // 'admin' | 'user'
  const [followUpFilter, setFollowUpFilter] = useState('All'); // 'All' | 'Mine'
  const [usersList, setUsersList] = useState([]);
  const [editingUser, setEditingUser] = useState(null);
  const [newUserPasswordInput, setNewUserPasswordInput] = useState('');
  const [selectedTimelineDate, setSelectedTimelineDate] = useState(null);

  // --- Profile Management & Role Checking ---
  const upsertProfile = async (sessionUser) => {
    try {
      const { data: profile, error: selectError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sessionUser.id)
        .maybeSingle();

      if (selectError) throw selectError;

      const defaultRole = sessionUser.email.toLowerCase() === 'vedant@vijapur.in' ? 'admin' : 'user';
      const name = sessionUser.user_metadata?.name || sessionUser.email.split('@')[0];
      let currentRole = defaultRole;

      if (!profile) {
        const { error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: sessionUser.id,
            email: sessionUser.email,
            name: name,
            role: defaultRole
          });
        if (insertError) throw insertError;
      } else {
        // Force logout if password changed after last sign-in
        if (profile.force_logout_at) {
          const forceLogoutTime = new Date(profile.force_logout_at).getTime();
          const lastSignInTime = new Date(sessionUser.last_sign_in_at).getTime();

          if (forceLogoutTime > lastSignInTime) {
            handleLogout();
            alert('Your session has been terminated because your password was changed. Please log in again.');
            return;
          }
        }

        currentRole = profile.role;
        // Keep profile in sync
        if (profile.name !== name || profile.email !== sessionUser.email) {
          await supabase
            .from('profiles')
            .update({ email: sessionUser.email, name: name })
            .eq('id', sessionUser.id);
        }
      }

      setUserRole(currentRole);
      if (currentRole === 'admin' || sessionUser.email.toLowerCase() === 'vedant@vijapur.in') {
        fetchUsersList();
      }
    } catch (err) {
      console.error('Error in upsertProfile:', err);
    }
  };

  const fetchUsersList = async () => {
    try {
      const { data: dbUsers, error } = await supabase
        .from('profiles')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw error;
      setUsersList(dbUsers || []);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  // --- Auth Initialization ---
  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        // Verify user against Supabase Auth database to check if deleted/disabled
        const { data: { user: verifiedUser }, error } = await supabase.auth.getUser();
        if (error || !verifiedUser) {
          handleLogout();
          alert('Your session is invalid (user account may have been deleted or disabled). Please log in again.');
          return;
        }
        setUser(verifiedUser);
        setIsAuthenticated(true);
        upsertProfile(verifiedUser);
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null;
      setUser(u);
      setIsAuthenticated(!!session);
      if (u) {
        upsertProfile(u);
      } else {
        setUserRole('user');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // --- Fetch Cloud Database Data on User Login (De-duplicated) ---
  useEffect(() => {
    if (!user) {
      setVendors([]);
      setCallLogs({});
      setVendorStatuses([]);
      setFetchedUserId(null);
      return;
    }
    
    if (user.id !== fetchedUserId) {
      setFetchedUserId(user.id);
      fetchData();
    }
  }, [user, fetchedUserId]);

  // --- Prevent standard users from accessing the settings tab ---
  useEffect(() => {
    const isAdmin = userRole === 'admin' || (user && user.email?.toLowerCase() === 'vedant@vijapur.in');
    if (!isAdmin && activeTab === 'settings') {
      setActiveTab('dashboard');
    }
  }, [userRole, user, activeTab]);

  // --- Realtime Profile Listener for Force Logout on Password Change ---
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`profile-force-logout-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`
        },
        (payload) => {
          if (payload.new && payload.new.force_logout_at) {
            const forceLogoutTime = new Date(payload.new.force_logout_at).getTime();
            const lastSignInTime = new Date(user.last_sign_in_at).getTime();

            if (forceLogoutTime > lastSignInTime) {
              handleLogout();
              alert('Your session has been terminated because your password was changed by an admin. Please log in again.');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchAllFromTable = async (tableName, selectQuery, orderByField, ascending = true) => {
    let allData = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
      let query = supabase
        .from(tableName)
        .select(selectQuery)
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order(orderByField, { ascending });

      if (orderByField !== 'id') {
        query = query.order('id', { ascending });
      }

      const { data: chunk, error } = await query;

      if (error) throw error;

      if (chunk && chunk.length > 0) {
        allData = [...allData, ...chunk];
        page++;
        if (chunk.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    return allData;
  };

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch all User Profiles
      const dbProfiles = await fetchAllFromTable('profiles', '*', 'id', true);
      const profilesMap = {};
      dbProfiles.forEach(p => {
        profilesMap[p.id] = p;
      });

      // 2. Fetch all Vendors
      const dbVendors = await fetchAllFromTable('vendors', '*', 'id', true);



      // Map profiles to vendors in memory
      const vendorsWithProfiles = dbVendors.map(vendor => {
        const profile = vendor.assigned_to ? profilesMap[vendor.assigned_to] : null;
        return {
          ...vendor,
          profiles: profile
        };
      });
      setVendors(vendorsWithProfiles);

      // 3. Fetch all Call Logs
      const dbLogs = await fetchAllFromTable('call_logs', '*', 'timestamp', false);

      // Compile logs into Map: { [vendorId]: [logs] } and extract latest status
      const logsMap = {};
      const statusesMap = {};

      dbLogs.forEach(log => {
        if (!logsMap[log.vendor_id]) {
          logsMap[log.vendor_id] = [];
        }
        const logProfile = log.user_id ? profilesMap[log.user_id] : null;
        logsMap[log.vendor_id].push({
          id: log.id,
          timestamp: log.timestamp,
          outcome: log.outcome,
          note: log.note,
          followUpDate: log.follow_up_date,
          user_id: log.user_id,
          userName: logProfile?.name || logProfile?.email?.split('@')[0] || 'Unknown User'
        });

        // The logs are ordered descending, so the first match we encounter is the latest status
        if (!statusesMap[log.vendor_id]) {
          statusesMap[log.vendor_id] = log.outcome;
        }
      });

      setCallLogs(logsMap);
      setVendorStatuses(statusesMap);

      // 4. Fetch all Vendor Snapshots
      const dbSnapshots = await fetchAllFromTable('vendor_snapshots', '*', 'snapshot_date', false);
      setSnapshots(dbSnapshots);

      // Extract unique snapshot dates (ordered descending by default)
      const uniqueDates = [...new Set(dbSnapshots.map(s => s.snapshot_date))];
      setAvailableDates(uniqueDates);

      // Default Comparison Date Range (last two syncs by default)
      if (uniqueDates.length >= 2) {
        setGrowthStartDate(uniqueDates[1]); // Second latest sync date
        setGrowthEndDate(uniqueDates[0]);   // Latest sync date
      } else if (uniqueDates.length === 1) {
        setGrowthStartDate(uniqueDates[0]);
        setGrowthEndDate(uniqueDates[0]);
      }

      if (userRole === 'admin' || user?.email?.toLowerCase() === 'vedant@vijapur.in') {
        await fetchUsersList();
      }



    } catch (err) {
      console.error('Error fetching Supabase data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- JSON Schema Mapper for nikunj.json ---
  const mapJsonToDbVendor = (v, userId) => {
    // Resolve brand names from nested list
    let brands = [];
    if (Array.isArray(v.vendorBrandsList)) {
      brands = v.vendorBrandsList.map(b => typeof b === 'object' && b ? b.brandName : String(b)).filter(Boolean);
    } else if (Array.isArray(v.vendor_brands_list)) {
      brands = v.vendor_brands_list;
    }

    return {
      vendor_id: v.vendorId || v.vendor_id || null,
      vendor_name: v.vendorName || v.vendor_name || 'Unnamed Vendor',
      previous_vendor_name: v.previousVendorName || v.previous_vendor_name || null,
      contact_person_name: v.contactPersonName || v.contact_person_name || v.contact_person || v.contactPerson || null,
      contact_person_email: v.contactPersonEmail || v.contact_person_email || v.email || null,
      contact_person_mobile: v.contactPersonMobile || v.contact_person_mobile || v.mobile || v.phone ? String(v.contactPersonMobile || v.contact_person_mobile || v.mobile || v.phone).trim() : null,
      address: v.address || '',
      website_url: v.websiteUrl || v.website_url || v.website || null,
      discom_json: v.discomJson || v.discom_json || null,
      rating: v.rating !== undefined && v.rating !== null ? parseFloat(v.rating) : 0,
      consumer_rating_count: v.consumerRatingCount !== undefined && v.consumerRatingCount !== null ? parseInt(v.consumerRatingCount) : (v.rating_count !== undefined ? parseInt(v.rating_count) : 0),
      vendor_brands_list: brands,
      user_request_type: v.userRequestType || v.user_request_type || null,
      
      nationwise_capacity: v.nationwiseInstallationAndCapacity?.installedCapacity !== undefined 
        ? parseFloat(v.nationwiseInstallationAndCapacity.installedCapacity) 
        : (v.nationwise_capacity !== undefined ? parseFloat(v.nationwise_capacity) : 0),
      nationwise_installs: v.nationwiseInstallationAndCapacity?.installationCount !== undefined 
        ? parseInt(v.nationwiseInstallationAndCapacity.installationCount) 
        : (v.nationwise_installs !== undefined ? parseInt(v.nationwise_installs) : 0),
        
      statewise_capacity: v.statewiseInstallationAndCapacity?.installedCapacity !== undefined 
        ? parseFloat(v.statewiseInstallationAndCapacity.installedCapacity) 
        : (v.statewise_capacity !== undefined ? parseFloat(v.statewise_capacity) : 0),
      statewise_installs: v.statewiseInstallationAndCapacity?.installationCount !== undefined 
        ? parseInt(v.statewiseInstallationAndCapacity.installationCount) 
        : (v.statewise_installs !== undefined ? parseInt(v.statewise_installs) : 0),
        
      districtwise_capacity: v.districtwiseInstallationAndCapacity?.installedCapacity !== undefined 
        ? parseFloat(v.districtwiseInstallationAndCapacity.installedCapacity) 
        : (v.districtwise_capacity !== undefined ? parseFloat(v.districtwise_capacity) : 0),
      districtwise_installs: v.districtwiseInstallationAndCapacity?.installationCount !== undefined 
        ? parseInt(v.districtwiseInstallationAndCapacity.installationCount) 
        : (v.districtwise_installs !== undefined ? parseInt(v.districtwise_installs) : 0),
        
      user_id: userId
    };
  };

  // --- Helper to synchronize/upsert incoming vendors with Supabase using name-based de-duplication ---
  const syncVendorsWithDb = async (incomingVendors) => {
    // 1. Fetch current vendors from DB paginated to bypass PostgREST's 1000 record select limit
    let allExistingVendors = [];
    let page = 0;
    let hasMore = true;
    const pageSize = 1000;
    
    while (hasMore) {
      const { data, error } = await supabase
        .from('vendors')
        .select('*')
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order('id', { ascending: true });
        
      if (error) throw error;
      
      if (data && data.length > 0) {
        allExistingVendors = [...allExistingVendors, ...data];
        page++;
        if (data.length < pageSize) {
          hasMore = false;
        }
      } else {
        hasMore = false;
      }
    }

    // Normalization functions for robust comparison
    const cleanStr = (s) => (s === null || s === undefined ? '' : String(s).trim());
    const cleanNum = (n) => (n === null || n === undefined || isNaN(Number(n)) ? 0 : Number(n));
    const cleanJson = (j) => {
      if (!j) return 'null';
      try {
        return JSON.stringify(j);
      } catch (e) {
        return 'null';
      }
    };
    const cleanArray = (arr) => {
      if (!arr) return '[]';
      const arrayVal = Array.isArray(arr) ? arr : [arr];
      const cleaned = arrayVal.map(x => cleanStr(x)).filter(Boolean).sort();
      return JSON.stringify(cleaned);
    };

    // Pre-pass: de-duplicate incoming vendors by company name (trimmed, case-insensitive) to prevent database conflicts
    const uniqueIncoming = [];
    const seenNames = new Set();
    
    for (let i = incomingVendors.length - 1; i >= 0; i--) {
      const uv = incomingVendors[i];
      const nameKey = cleanStr(uv.vendor_name).toLowerCase();
      if (!seenNames.has(nameKey)) {
        seenNames.add(nameKey);
        uniqueIncoming.unshift(uv); // Preserve original order
      }
    }

    let vendorsToInsert = [];
    let vendorsToUpdate = [];
    let updatedCount = 0;
    let insertedCount = 0;
    let skippedCount = 0;

    uniqueIncoming.forEach(uv => {
      // Find matching existing vendor by vendor_id first, then by company name (trimmed, case-insensitive)
      const existing = allExistingVendors.find(v => {
        if (uv.vendor_id && v.vendor_id && Number(uv.vendor_id) === Number(v.vendor_id)) {
          return true;
        }
        return cleanStr(v.vendor_name).toLowerCase() === cleanStr(uv.vendor_name).toLowerCase();
      });

      if (existing) {
        // Compare fields to see if anything changed (including name)
        const hasChanged = 
          cleanStr(uv.vendor_name) !== cleanStr(existing.vendor_name) ||
          cleanNum(uv.vendor_id) !== cleanNum(existing.vendor_id) ||
          cleanStr(uv.previous_vendor_name) !== cleanStr(existing.previous_vendor_name) ||
          cleanStr(uv.contact_person_name) !== cleanStr(existing.contact_person_name) ||
          cleanStr(uv.contact_person_email) !== cleanStr(existing.contact_person_email) ||
          cleanStr(uv.contact_person_mobile) !== cleanStr(existing.contact_person_mobile) ||
          cleanStr(uv.address) !== cleanStr(existing.address) ||
          cleanStr(uv.website_url) !== cleanStr(existing.website_url) ||
          cleanNum(uv.rating) !== cleanNum(existing.rating) ||
          cleanNum(uv.consumer_rating_count) !== cleanNum(existing.consumer_rating_count) ||
          cleanStr(uv.user_request_type) !== cleanStr(existing.user_request_type) ||
          cleanNum(uv.nationwise_capacity) !== cleanNum(existing.nationwise_capacity) ||
          cleanNum(uv.nationwise_installs) !== cleanNum(existing.nationwise_installs) ||
          cleanNum(uv.statewise_capacity) !== cleanNum(existing.statewise_capacity) ||
          cleanNum(uv.statewise_installs) !== cleanNum(existing.statewise_installs) ||
          cleanNum(uv.districtwise_capacity) !== cleanNum(existing.districtwise_capacity) ||
          cleanNum(uv.districtwise_installs) !== cleanNum(existing.districtwise_installs) ||
          cleanArray(uv.vendor_brands_list) !== cleanArray(existing.vendor_brands_list) ||
          cleanJson(uv.discom_json) !== cleanJson(existing.discom_json);

        if (hasChanged) {
          // Update the existing row by specifying its database primary key 'id'
          vendorsToUpdate.push({
            ...uv,
            id: existing.id,
            assigned_to: existing.assigned_to, // Keep existing user assignment
            user_id: existing.user_id // Keep existing owner user_id
          });
          updatedCount++;
        } else {
          skippedCount++;
        }
      } else {
        // Brand new company name, insert as new entry
        vendorsToInsert.push(uv);
        insertedCount++;
      }
    });

    // 1. Bulk Insert for brand new records (without 'id' property so Postgres auto-generates the serial primary key)
    if (vendorsToInsert.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < vendorsToInsert.length; i += chunkSize) {
        const chunk = vendorsToInsert.slice(i, i + chunkSize);
        const { error: insertError } = await supabase
          .from('vendors')
          .insert(chunk);
        if (insertError) throw insertError;
      }
    }

    // 2. Bulk Upsert (Update) for existing records (with 'id' property specified to update existing rows)
    if (vendorsToUpdate.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < vendorsToUpdate.length; i += chunkSize) {
        const chunk = vendorsToUpdate.slice(i, i + chunkSize);
        const { error: upsertError } = await supabase
          .from('vendors')
          .upsert(chunk);
        if (upsertError) throw upsertError;
      }
    }

    // 3. Record vendor capacity snapshots for today
    const allUpdatedVendors = await fetchAllFromTable('vendors', '*', 'id', true);

    const todayStr = new Date().toISOString().split('T')[0];
    const snapshotRecords = [];
    
    allUpdatedVendors.forEach(dbVendor => {
      const uv = uniqueIncoming.find(u => 
        cleanStr(u.vendor_name).toLowerCase() === cleanStr(dbVendor.vendor_name).toLowerCase()
      );
      if (uv) {
        snapshotRecords.push({
          vendor_id: dbVendor.id,
          snapshot_date: todayStr,
          nationwise_capacity: uv.nationwise_capacity,
          nationwise_installs: uv.nationwise_installs,
          statewise_capacity: uv.statewise_capacity,
          statewise_installs: uv.statewise_installs,
          districtwise_capacity: uv.districtwise_capacity,
          districtwise_installs: uv.districtwise_installs
        });
      } else {
        snapshotRecords.push({
          vendor_id: dbVendor.id,
          snapshot_date: todayStr,
          nationwise_capacity: parseFloat(dbVendor.nationwise_capacity || 0),
          nationwise_installs: parseInt(dbVendor.nationwise_installs || 0),
          statewise_capacity: parseFloat(dbVendor.statewise_capacity || 0),
          statewise_installs: parseInt(dbVendor.statewise_installs || 0),
          districtwise_capacity: parseFloat(dbVendor.districtwise_capacity || 0),
          districtwise_installs: parseInt(dbVendor.districtwise_installs || 0)
        });
      }
    });

    if (snapshotRecords.length > 0) {
      const chunkSize = 200;
      for (let i = 0; i < snapshotRecords.length; i += chunkSize) {
        const chunk = snapshotRecords.slice(i, i + chunkSize);
        const { error: snapshotError } = await supabase
          .from('vendor_snapshots')
          .upsert(chunk, { onConflict: 'vendor_id,snapshot_date' });
        if (snapshotError) throw snapshotError;
      }
    }

    return { insertedCount, updatedCount, skippedCount };
  };



  // --- Helper to get Today's Date String in local format ---
  const getTodayString = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  // --- NLP Parsing for note textarea ---
  useEffect(() => {
    if (callNote) {
      const parsedDate = parseFollowUpDate(callNote);
      if (parsedDate) {
        setAutoDateDetected(parsedDate);
        setCustomFollowUpDate(parsedDate);
      } else {
        setAutoDateDetected('');
      }
    } else {
      setAutoDateDetected('');
    }
  }, [callNote]);

  // --- Computed Vendors list with status and latest follow up date merged ---
  const mergedVendors = useMemo(() => {
    // Find the last two sync dates
    const latestDate = availableDates[0] || null;
    const prevDate = availableDates[1] || null;

    // Create lookup maps for performance
    const latestCapMap = {};
    const prevCapMap = {};

    if (latestDate && prevDate && snapshots.length > 0) {
      snapshots.forEach(s => {
        if (s.snapshot_date === latestDate) {
          latestCapMap[s.vendor_id] = parseFloat(s.nationwise_capacity) || 0;
        } else if (s.snapshot_date === prevDate) {
          prevCapMap[s.vendor_id] = parseFloat(s.nationwise_capacity) || 0;
        }
      });
    }

    return vendors.map(vendor => {
      const status = vendorStatuses[vendor.id] || 'Pending';
      const logs = callLogs[vendor.id] || [];
      // Find latest follow up date from the log entries
      let latestFollowUp = null;
      if (logs.length > 0) {
        const sorted = [...logs].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        const logWithDate = sorted.find(l => l.followUpDate);
        if (logWithDate) {
          latestFollowUp = logWithDate.followUpDate;
        }
      }
      const loc = getVendorLocation(vendor.address);

      // Compute capacity difference between last two syncs
      const latestCap = latestCapMap[vendor.id] !== undefined ? latestCapMap[vendor.id] : (parseFloat(vendor.nationwise_capacity) || 0);
      const prevCap = prevCapMap[vendor.id] !== undefined ? prevCapMap[vendor.id] : 0;
      const capacityDiff = latestCap - prevCap;

      return {
        ...vendor,
        status,
        latestFollowUp,
        logs,
        assignedName: vendor.profiles?.name || vendor.profiles?.email?.split('@')[0] || null,
        state: loc.state,
        district: loc.district,
        capacity_difference: capacityDiff
      };
    });
  }, [vendors, callLogs, vendorStatuses, availableDates, snapshots]);

  // --- Filters ---
  const filteredVendors = useMemo(() => {
    return mergedVendors.filter(vendor => {
      const query = searchQuery.toLowerCase();
      
      // Brand matching
      const brandStr = Array.isArray(vendor.vendor_brands_list) 
        ? vendor.vendor_brands_list.join(' ').toLowerCase() 
        : '';
        
      const matchesSearch = 
        vendor.vendor_name.toLowerCase().includes(query) ||
        (vendor.contact_person_name && vendor.contact_person_name.toLowerCase().includes(query)) ||
        (vendor.contact_person_mobile && vendor.contact_person_mobile.toLowerCase().includes(query)) ||
        (vendor.contact_person_email && vendor.contact_person_email.toLowerCase().includes(query)) ||
        (vendor.address && vendor.address.toLowerCase().includes(query)) ||
        brandStr.includes(query);
      
      if (!matchesSearch) return false;

      if (statusFilter !== 'All' && vendor.status !== statusFilter) return false;

      if (ratingFilter !== 'All') {
        const minRating = parseFloat(ratingFilter);
        if (vendor.rating < minRating) return false;
      }

      if (stateFilter !== 'All' && vendor.state !== stateFilter) return false;
      if (districtFilter !== 'All' && vendor.district !== districtFilter) return false;

      return true;
    });
  }, [mergedVendors, searchQuery, statusFilter, ratingFilter, stateFilter, districtFilter]);

  // --- Sort ---
  const sortedVendors = useMemo(() => {
    const sorted = [...filteredVendors];
    
    sorted.sort((a, b) => {
      if (sortBy === 'created_at') {
        const timeA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const timeB = b.created_at ? new Date(b.created_at).getTime() : 0;
        return sortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      }

      let valA = a[sortBy];
      let valB = b[sortBy];

      // Handle null/undefined
      if (valA === undefined || valA === null) valA = '';
      if (valB === undefined || valB === null) valB = '';

      // Perform conversion if numeric
      if (sortBy.includes('capacity') || sortBy.includes('installs') || sortBy === 'rating' || sortBy === 'consumer_rating_count') {
        const numA = parseFloat(valA) || 0;
        const numB = parseFloat(valB) || 0;
        return sortOrder === 'asc' ? numA - numB : numB - numA;
      }

      // Default string comparison
      const strA = String(valA).toLowerCase();
      const strB = String(valB).toLowerCase();
      
      if (strA < strB) return sortOrder === 'asc' ? -1 : 1;
      if (strA > strB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return sorted;
  }, [filteredVendors, sortBy, sortOrder]);

  // Paginated vendors for Directory view
  const paginatedVendors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedVendors.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedVendors, currentPage]);

  const totalPages = Math.ceil(sortedVendors.length / itemsPerPage);

  // --- Location Dropdowns Memos ---
  const uniqueStates = useMemo(() => {
    const states = new Set(mergedVendors.map(v => v.state).filter(Boolean));
    return ['All', ...Array.from(states).sort()];
  }, [mergedVendors]);

  const uniqueDistricts = useMemo(() => {
    const filteredForState = stateFilter === 'All' 
      ? mergedVendors 
      : mergedVendors.filter(v => v.state === stateFilter);
    const districts = new Set(filteredForState.map(v => v.district).filter(Boolean));
    return ['All', ...Array.from(districts).sort()];
  }, [mergedVendors, stateFilter]);

  const totalFilteredCapacity = useMemo(() => {
    const key = sortBy.includes('capacity') ? sortBy : 'nationwise_capacity';
    return sortedVendors.reduce((acc, v) => acc + (parseFloat(v[key]) || 0), 0);
  }, [sortedVendors, sortBy]);

  // --- Capacity Breakdown Stats for Dashboard ---
  const capacityStats = useMemo(() => {
    const stateDataMap = {};
    mergedVendors.forEach(v => {
      const state = v.state || 'Unknown';
      if (!stateDataMap[state]) {
        stateDataMap[state] = { state, leadsCount: 0, totalCapacity: 0 };
      }
      stateDataMap[state].leadsCount++;
      stateDataMap[state].totalCapacity += parseFloat(v.statewise_capacity) || 0;
    });

    const stateList = Object.values(stateDataMap);

    const districtDataMap = {};
    mergedVendors.forEach(v => {
      const state = v.state || 'Unknown';
      const district = v.district || 'Other';
      
      if (!districtDataMap[state]) {
        districtDataMap[state] = {};
      }
      if (!districtDataMap[state][district]) {
        districtDataMap[state][district] = { district, leadsCount: 0, totalCapacity: 0 };
      }
      districtDataMap[state][district].leadsCount++;
      districtDataMap[state][district].totalCapacity += parseFloat(v.districtwise_capacity) || 0;
    });

    return {
      stateList,
      districtDataMap
    };
  }, [mergedVendors]);

  const sortedDashboardStates = useMemo(() => {
    return [...capacityStats.stateList].sort((a, b) => {
      return dashboardStateSortOrder === 'asc' 
        ? a.totalCapacity - b.totalCapacity 
        : b.totalCapacity - a.totalCapacity;
    });
  }, [capacityStats.stateList, dashboardStateSortOrder]);

  const sortedDashboardDistricts = useMemo(() => {
    const districtsForState = capacityStats.districtDataMap[dashboardSelectedState] || {};
    return Object.values(districtsForState).sort((a, b) => {
      return dashboardDistrictSortOrder === 'asc' 
        ? a.totalCapacity - b.totalCapacity 
        : b.totalCapacity - a.totalCapacity;
    });
  }, [capacityStats.districtDataMap, dashboardSelectedState, dashboardDistrictSortOrder]);

  // --- Stats Computations ---
  const stats = useMemo(() => {
    const total = mergedVendors.length;
    let pending = 0;
    let interested = 0;
    let callback = 0;
    let uninterested = 0;
    let demoScheduled = 0;
    let called = 0;
    let todayFollowUps = 0;
    let todayDemos = 0;
    
    const todayStr = getTodayString();

    mergedVendors.forEach(v => {
      if (v.status === 'Pending') pending++;
      else {
        called++;
        if (v.status === 'Interested') interested++;
        if (v.status === 'Callback') callback++;
        if (v.status === 'Uninterested') uninterested++;
        if (v.status === 'Demo Scheduled') demoScheduled++;
      }
      
      if (v.latestFollowUp === todayStr) {
        if (v.status === 'Demo Scheduled') {
          todayDemos++;
        } else {
          todayFollowUps++;
        }
      }
    });

    return {
      total,
      pending,
      called,
      interested,
      callback,
      uninterested,
      demoScheduled,
      todayFollowUps,
      todayDemos
    };
  }, [mergedVendors]);

  // Today's Follow-up vendors
  const todayFollowUpVendors = useMemo(() => {
    const todayStr = getTodayString();
    return mergedVendors.filter(v => v.latestFollowUp === todayStr && v.status !== 'Demo Scheduled');
  }, [mergedVendors]);

  // Today's Demo vendors
  const todayDemoVendors = useMemo(() => {
    const todayStr = getTodayString();
    return mergedVendors.filter(v => v.latestFollowUp === todayStr && v.status === 'Demo Scheduled');
  }, [mergedVendors]);

  const formatDateTime = (dateStr) => {
    if (!dateStr) return 'Not Listed';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch (e) {
      return 'Not Listed';
    }
  };

  const newlyRegisteredCompanies = useMemo(() => {
    const sorted = [...vendors].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
      const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateB.getTime() - dateA.getTime();
      }
      return b.id - a.id;
    });
    return sorted.slice(0, 5);
  }, [vendors]);

  const timelineGroupedVendors = useMemo(() => {
    const groups = {};
    mergedVendors.forEach(vendor => {
      const dateStr = vendor.created_at ? vendor.created_at.split('T')[0] : 'Unknown';
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(vendor);
    });

    // Sort dates descending (newest dates first)
    const sortedDates = Object.keys(groups).sort((a, b) => {
      if (a === 'Unknown') return 1;
      if (b === 'Unknown') return -1;
      return new Date(b).getTime() - new Date(a).getTime();
    });

    return {
      groups,
      sortedDates
    };
  }, [mergedVendors]);

  // Set default selected timeline date
  useEffect(() => {
    if (!selectedTimelineDate && timelineGroupedVendors.sortedDates.length > 0) {
      setSelectedTimelineDate(timelineGroupedVendors.sortedDates[0]);
    }
  }, [timelineGroupedVendors, selectedTimelineDate]);

  const formatGrowthValue = (value) => {
    if (value > 0) return `+${value.toLocaleString()}`;
    return value.toLocaleString();
  };

  const getGrowthColor = (value, defaultColor = 'var(--text-primary)') => {
    if (value > 0) return '#10b981';
    if (value < 0) return '#ef4444';
    return defaultColor;
  };

  // Growth & sync snapshots comparison analytics
  const growthComparison = useMemo(() => {
    if (!growthStartDate || !growthEndDate || snapshots.length === 0) {
      return null;
    }

    const cleanStr = (s) => (s === null || s === undefined ? '' : String(s).trim());

    // Filter snapshots for start date and end date
    const startSnapshots = snapshots.filter(s => s.snapshot_date === growthStartDate);
    const endSnapshots = snapshots.filter(s => s.snapshot_date === growthEndDate);

    // Create maps: vendor_id -> snapshot
    const startMap = {};
    startSnapshots.forEach(s => {
      startMap[s.vendor_id] = s;
    });

    const endMap = {};
    endSnapshots.forEach(s => {
      endMap[s.vendor_id] = s;
    });

    let totalStartInstalls = 0;
    let totalStartCapacity = 0;
    let totalEndInstalls = 0;
    let totalEndCapacity = 0;

    let totalStateStartCapacity = 0;
    let totalStateStartInstalls = 0;
    let totalStateEndCapacity = 0;
    let totalStateEndInstalls = 0;

    let totalDistrictStartCapacity = 0;
    let totalDistrictStartInstalls = 0;
    let totalDistrictEndCapacity = 0;
    let totalDistrictEndInstalls = 0;

    const vendorGrowthList = [];

    // Loop through all vendors
    vendors.forEach(v => {
      const startSnap = startMap[v.id];
      const endSnap = endMap[v.id];

      // If either snapshot exists, we track it
      if (startSnap || endSnap) {
        const startNationwiseCap = startSnap ? parseFloat(startSnap.nationwise_capacity || 0) : 0;
        const startNationwiseInst = startSnap ? parseInt(startSnap.nationwise_installs || 0) : 0;
        const startStatewiseCap = startSnap ? parseFloat(startSnap.statewise_capacity || 0) : 0;
        const startStatewiseInst = startSnap ? parseInt(startSnap.statewise_installs || 0) : 0;
        const startDistrictwiseCap = startSnap ? parseFloat(startSnap.districtwise_capacity || 0) : 0;
        const startDistrictwiseInst = startSnap ? parseInt(startSnap.districtwise_installs || 0) : 0;

        const endNationwiseCap = endSnap ? parseFloat(endSnap.nationwise_capacity || 0) : 0;
        const endNationwiseInst = endSnap ? parseInt(endSnap.nationwise_installs || 0) : 0;
        const endStatewiseCap = endSnap ? parseFloat(endSnap.statewise_capacity || 0) : 0;
        const endStatewiseInst = endSnap ? parseInt(endSnap.statewise_installs || 0) : 0;
        const endDistrictwiseCap = endSnap ? parseFloat(endSnap.districtwise_capacity || 0) : 0;
        const endDistrictwiseInst = endSnap ? parseInt(endSnap.districtwise_installs || 0) : 0;

        totalStartInstalls += startNationwiseInst;
        totalStartCapacity += startNationwiseCap;
        totalEndInstalls += endNationwiseInst;
        totalEndCapacity += endNationwiseCap;

        totalStateStartCapacity += startStatewiseCap;
        totalStateStartInstalls += startStatewiseInst;
        totalStateEndCapacity += endStatewiseCap;
        totalStateEndInstalls += endStatewiseInst;

        totalDistrictStartCapacity += startDistrictwiseCap;
        totalDistrictStartInstalls += startDistrictwiseInst;
        totalDistrictEndCapacity += endDistrictwiseCap;
        totalDistrictEndInstalls += endDistrictwiseInst;

        const capDiff = endNationwiseCap - startNationwiseCap;
        const instDiff = endNationwiseInst - startNationwiseInst;

        const stateCapDiff = endStatewiseCap - startStatewiseCap;
        const stateInstDiff = endStatewiseInst - startStatewiseInst;

        const districtCapDiff = endDistrictwiseCap - startDistrictwiseCap;
        const districtInstDiff = endDistrictwiseInst - startDistrictwiseInst;

        if (capDiff !== 0 || instDiff !== 0 || stateCapDiff !== 0 || stateInstDiff !== 0 || districtCapDiff !== 0 || districtInstDiff !== 0) {
          vendorGrowthList.push({
            id: v.id,
            vendor_name: v.vendor_name,
            address: v.address,
            startCapacity: startNationwiseCap,
            startInstalls: startNationwiseInst,
            endCapacity: endNationwiseCap,
            endInstalls: endNationwiseInst,
            capDiff,
            instDiff,
            stateCapDiff,
            stateInstDiff,
            districtCapDiff,
            districtInstDiff
          });
        }
      }
    });

    // Sort growth list by installation diff descending, then capacity diff descending
    vendorGrowthList.sort((a, b) => b.instDiff - a.instDiff || b.capDiff - a.capDiff);

    return {
      nationwise: {
        startCapacity: totalStartCapacity,
        startInstalls: totalStartInstalls,
        endCapacity: totalEndCapacity,
        endInstalls: totalEndInstalls,
        capacityGrowth: totalEndCapacity - totalStartCapacity,
        installGrowth: totalEndInstalls - totalStartInstalls
      },
      statewise: {
        startCapacity: totalStateStartCapacity,
        startInstalls: totalStateStartInstalls,
        endCapacity: totalStateEndCapacity,
        endInstalls: totalStateEndInstalls,
        capacityGrowth: totalStateEndCapacity - totalStateStartCapacity,
        installGrowth: totalStateEndInstalls - totalStateStartInstalls
      },
      districtwise: {
        startCapacity: totalDistrictStartCapacity,
        startInstalls: totalDistrictStartInstalls,
        endCapacity: totalDistrictEndCapacity,
        endInstalls: totalDistrictEndInstalls,
        capacityGrowth: totalDistrictEndCapacity - totalDistrictStartCapacity,
        installGrowth: totalDistrictEndInstalls - totalDistrictStartInstalls
      },
      vendorsGrowth: vendorGrowthList
    };
  }, [growthStartDate, growthEndDate, snapshots, vendors]);

  // Snapshots for selected vendor to show history timeline
  const selectedVendorSnapshots = useMemo(() => {
    if (!selectedVendor || snapshots.length === 0) return [];
    return snapshots
      .filter(s => s.vendor_id === selectedVendor.id)
      .sort((a, b) => new Date(b.snapshot_date) - new Date(a.snapshot_date));
  }, [selectedVendor, snapshots]);

  const filteredTodayFollowUps = useMemo(() => {
    if (followUpFilter === 'Mine' && user) {
      return todayFollowUpVendors.filter(v => v.assigned_to === user.id);
    }
    return todayFollowUpVendors;
  }, [todayFollowUpVendors, followUpFilter, user]);

  // --- Calendar Computations ---
  const calendarDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push({
        dayNum: d,
        dateString: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let d = 1; d <= lastDay; d++) {
      days.push({
        dayNum: d,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: true
      });
    }
    
    // Next month filler days to complete grid
    const remainingCells = 42 - days.length;
    for (let d = 1; d <= remainingCells; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      days.push({
        dayNum: d,
        dateString: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [calendarDate]);

  // Map of follow-up dates and counts for calendar
  const calendarFollowUpMap = useMemo(() => {
    const map = {};
    mergedVendors.forEach(v => {
      if (v.latestFollowUp) {
        if (!map[v.latestFollowUp]) {
          map[v.latestFollowUp] = [];
        }
        map[v.latestFollowUp].push(v);
      }
    });
    return map;
  }, [mergedVendors]);

  // Selected calendar day vendors
  const selectedDayVendors = useMemo(() => {
    if (!selectedCalendarDay) return [];
    return calendarFollowUpMap[selectedCalendarDay] || [];
  }, [selectedCalendarDay, calendarFollowUpMap]);

  const filteredSelectedDayVendors = useMemo(() => {
    if (followUpFilter === 'Mine' && user) {
      return selectedDayVendors.filter(v => v.assigned_to === user.id);
    }
    return selectedDayVendors;
  }, [selectedDayVendors, followUpFilter, user]);

  // --- Demo Calendar Computations ---
  const demoCalendarDays = useMemo(() => {
    const year = demoCalendarDate.getFullYear();
    const month = demoCalendarDate.getMonth();
    
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDay = new Date(year, month + 1, 0).getDate();
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    
    const days = [];
    
    // Previous month filler days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const m = month === 0 ? 11 : month - 1;
      const y = month === 0 ? year - 1 : year;
      days.push({
        dayNum: d,
        dateString: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }
    
    // Current month days
    for (let d = 1; d <= lastDay; d++) {
      days.push({
        dayNum: d,
        dateString: `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: true
      });
    }
    
    // Next month filler days to complete grid
    const remainingCells = 42 - days.length;
    for (let d = 1; d <= remainingCells; d++) {
      const m = month === 11 ? 0 : month + 1;
      const y = month === 11 ? year + 1 : year;
      days.push({
        dayNum: d,
        dateString: `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isCurrentMonth: false
      });
    }
    
    return days;
  }, [demoCalendarDate]);

  // Map of demo dates and counts for calendar
  const calendarDemoMap = useMemo(() => {
    const map = {};
    mergedVendors.forEach(v => {
      if (v.status === 'Demo Scheduled' && v.latestFollowUp) {
        if (!map[v.latestFollowUp]) {
          map[v.latestFollowUp] = [];
        }
        map[v.latestFollowUp].push(v);
      }
    });
    return map;
  }, [mergedVendors]);

  // Selected demo calendar day vendors
  const selectedDemoDayVendors = useMemo(() => {
    if (!selectedDemoCalendarDay) return [];
    return calendarDemoMap[selectedDemoCalendarDay] || [];
  }, [selectedDemoCalendarDay, calendarDemoMap]);

  const filteredSelectedDemoDayVendors = useMemo(() => {
    if (followUpFilter === 'Mine' && user) {
      return selectedDemoDayVendors.filter(v => v.assigned_to === user.id);
    }
    return selectedDemoDayVendors;
  }, [selectedDemoDayVendors, followUpFilter, user]);

  // --- Auth Handlers ---
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail.toLowerCase().trim(),
        password: loginPassword
      });
      if (error) {
        setLoginError(error.message);
      } else {
        setLoginPassword('');
      }
    } catch (err) {
      setLoginError('Could not log in. Check your internet connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (window.confirm('Are you sure you want to sign out?')) {
      setIsLoading(true);
      setActiveTab('dashboard');
      await supabase.auth.signOut();
      setIsLoading(false);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserEmail.trim() || !newUserPassword) {
      alert('Please fill out all fields.');
      return;
    }
    if (newUserPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    try {
      const tempSupabase = createClient(supabaseUrl, supabaseAnonKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false
        }
      });

      const { data, error } = await tempSupabase.auth.signUp({
        email: newUserEmail.trim().toLowerCase(),
        password: newUserPassword,
        options: {
          data: {
            name: newUserName.trim()
          }
        }
      });

      if (error) throw error;
      if (!data.user) throw new Error('User creation returned empty data.');

      const { error: profileError } = await tempSupabase
        .from('profiles')
        .upsert({
          id: data.user.id,
          email: newUserEmail.trim().toLowerCase(),
          name: newUserName.trim(),
          role: newUserRole
        });

      if (profileError) throw profileError;

      alert(`User account successfully created for ${newUserName.trim()} (${newUserRole})!`);
      
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('user');

      await fetchUsersList();
    } catch (err) {
      console.error(err);
      alert(`Failed to create user account: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminChangePassword = async (e) => {
    e.preventDefault();
    if (!editingUser || !newUserPasswordInput) {
      alert('Please fill out the new password.');
      return;
    }
    if (newUserPasswordInput.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setIsLoading(true);
    try {
      const { error } = await supabase.rpc('admin_change_user_password', {
        user_uuid: editingUser.id,
        new_password: newUserPasswordInput
      });

      if (error) throw error;

      alert(`Password successfully updated for ${editingUser.name}!`);
      setEditingUser(null);
      setNewUserPasswordInput('');
    } catch (err) {
      console.error(err);
      alert(`Failed to update password: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // --- CRM Interaction Handlers ---
  const handleOpenCallModal = (vendor) => {
    setSelectedVendor(vendor);
    setCallOutcome(vendor.status !== 'Pending' ? vendor.status : 'Interested');
    setCallNote('');
    setCustomFollowUpDate(vendor.latestFollowUp || '');
    setAutoDateDetected('');
  };

  const handleSaveCallLog = async () => {
    if (!selectedVendor) return;
    setIsLoading(true);

    try {
      const { data, error } = await supabase
        .from('call_logs')
        .insert([{
          vendor_id: selectedVendor.id,
          outcome: callOutcome,
          note: callNote || 'No description provided.',
          follow_up_date: customFollowUpDate || null,
          user_id: user.id
        }])
        .select();

      if (error) throw error;

      // Update vendor lead to be assigned to the current user
      const { error: vError } = await supabase
        .from('vendors')
        .update({ assigned_to: user.id })
        .eq('id', selectedVendor.id);

      if (vError) throw vError;

      // Close Modal and reset
      setSelectedVendor(null);
      setCallNote('');
      setCustomFollowUpDate('');
      setAutoDateDetected('');
      
      // Refresh database records
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to save call log to database.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteLog = async (logId) => {
    if (!window.confirm('Are you sure you want to delete this log entry?')) return;
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('call_logs')
        .delete()
        .eq('id', logId);

      if (error) throw error;
      setSelectedVendor(null);
      await fetchData();
    } catch (err) {
      console.error(err);
      alert('Failed to delete log entry.');
    } finally {
      setIsLoading(false);
    }
  };

  // JSON file upload handler in cloud database
  const handleJsonUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsLoading(true);
        
        // Refresh and verify session (handles 8-hour login token expiry)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error("Your login session has expired. Please log out and log in again to upload database updates.");
        }

        const rawText = evt.target.result;
        let rawData;
        try {
          rawData = JSON.parse(rawText);
        } catch (parseErr) {
          throw new Error('Invalid JSON format. Please upload a valid JSON database file.');
        }
        
        let rawRows = [];
        if (Array.isArray(rawData)) {
          rawRows = rawData;
        } else if (rawData && typeof rawData === 'object') {
          if (Array.isArray(rawData.vendors)) {
            rawRows = rawData.vendors;
          } else {
            alert('Invalid JSON structure. Must be an array of vendors.');
            return;
          }
        } else {
          alert('Invalid JSON file format.');
          return;
        }

        if (rawRows.length === 0) {
          alert('JSON file contains 0 vendors!');
          return;
        }

        const uploadedVendors = rawRows.map((row) => mapJsonToDbVendor(row, session.user.id));

        // Sync uploaded vendors with database using name-based de-duplication
        const { insertedCount, updatedCount, skippedCount } = await syncVendorsWithDb(uploadedVendors);

        alert(`Import complete!\nSync details: ${insertedCount} new vendors added, ${updatedCount} existing vendors updated, and ${skippedCount} unchanged vendors were skipped.`);

        setCurrentPage(1);
        await fetchData();
      } catch (err) {
        console.error(err);
        alert(err.message || 'Failed to import JSON data. Ensure the JSON file is valid.');
      } finally {
        setIsLoading(false);
        e.target.value = ''; // Reset input
      }
    };
    reader.readAsText(file);
  };

  // Data Export Handler
  const handleExportData = () => {
    const dataToExport = {
      vendorStatuses,
      callLogs,
      exportedAt: new Date().toISOString()
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(dataToExport, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `solar_crm_export_${getTodayString()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // VCF Contacts Export Handler
  const handleExportVCF = () => {
    // Only export vendors that have a mobile/phone number
    const contactsToExport = sortedVendors.filter(v => v.contact_person_mobile && v.contact_person_mobile.trim() !== '');

    if (contactsToExport.length === 0) {
      alert("No contacts with mobile numbers found in the current list to export.");
      return;
    }

    let vcfContent = "";
    contactsToExport.forEach(v => {
      const company = (v.vendor_name || "Unnamed Company").replace(/[,;\\]/g, '\\$&').trim();
      const contact = (v.contact_person_name || "").replace(/[,;\\]/g, '\\$&').trim();
      const phone = v.contact_person_mobile.trim();
      
      // Full name format: "Company Name - Contact Name" or just "Company Name"
      const fullName = contact ? `${company} - ${contact}` : company;

      vcfContent += "BEGIN:VCARD\r\n";
      vcfContent += "VERSION:3.0\r\n";
      vcfContent += `FN:${fullName}\r\n`;
      vcfContent += `ORG:${company}\r\n`;
      vcfContent += `N:;${fullName};;;\r\n`;
      vcfContent += `TEL;TYPE=CELL,VOICE:${phone}\r\n`;
      vcfContent += "END:VCARD\r\n";
    });

    const blob = new Blob([vcfContent], { type: "text/vcard;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);
    
    // Create a descriptive file name based on active filters
    let filename = "solar_crm_contacts";
    if (stateFilter !== 'All') {
      filename += `_${stateFilter.toLowerCase().replace(/\s+/g, '_')}`;
    }
    if (districtFilter !== 'All') {
      filename += `_${districtFilter.toLowerCase().replace(/\s+/g, '_')}`;
    }
    if (statusFilter !== 'All') {
      filename += `_${statusFilter.toLowerCase().replace(/\s+/g, '_')}`;
    }
    filename += ".vcf";

    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  // Meta/Facebook Ads CSV Export Handler
  const handleExportFacebookCSV = () => {
    // For Facebook Ads, we need contacts that have either a phone number or an email address
    const contactsToExport = sortedVendors.filter(v => 
      (v.contact_person_mobile && v.contact_person_mobile.trim() !== '') ||
      (v.contact_person_email && v.contact_person_email.trim() !== '')
    );

    if (contactsToExport.length === 0) {
      alert("No contacts with mobile numbers or emails found in the current list to export.");
      return;
    }

    const headers = [
      'email',
      'phone',
      'add_to_me',
      'madid',
      'fn',
      'ln',
      'zip',
      'ct',
      'st',
      'country',
      'dob',
      'doby',
      'gen',
      'age',
      'uid'
    ];

    const escapeCSV = (val) => {
      if (val === null || val === undefined) return '';
      let str = String(val).trim();
      if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        str = '"' + str.replace(/"/g, '""') + '"';
      }
      return str;
    };

    const csvRows = [headers.join(',')];

    contactsToExport.forEach(v => {
      let email = (v.contact_person_email || '').trim().toLowerCase();
      
      let rawPhone = v.contact_person_mobile || '';
      let cleanedPhone = rawPhone.replace(/\D/g, ''); // Extract only digits
      if (cleanedPhone.length === 10) {
        cleanedPhone = '91' + cleanedPhone; // Default to India country code 91 if it's a 10-digit number
      }

      let fn = '';
      let ln = '';
      if (v.contact_person_name) {
        const parts = v.contact_person_name.trim().split(/\s+/);
        fn = parts[0] || '';
        if (parts.length > 1) {
          ln = parts.slice(1).join(' ');
        }
      }

      // Try to parse zip code from the address field
      let zip = '';
      if (v.address) {
        // Look for 6-digit PIN code (India)
        const pinMatch = v.address.match(/\b\d{6}\b/);
        if (pinMatch) {
          zip = pinMatch[0];
        } else {
          // Look for 5-digit ZIP code (US)
          const zipMatch = v.address.match(/\b\d{5}\b/);
          if (zipMatch) {
            zip = zipMatch[0];
          }
        }
      }

      let ct = v.district && v.district !== 'Other' ? v.district : '';
      let st = v.state && v.state !== 'Unknown' ? v.state : '';
      
      // Attempt to identify country, default to 'IN'
      let country = 'IN';
      if (v.address) {
        const addrLower = v.address.toLowerCase();
        if (addrLower.includes('usa') || addrLower.includes('united states') || addrLower.includes('u.s.a.')) {
          country = 'US';
        } else if (addrLower.includes('united kingdom') || addrLower.includes('\buk\b') || addrLower.includes('london')) {
          country = 'GB';
        }
      }

      const row = [
        escapeCSV(email),
        escapeCSV(cleanedPhone),
        escapeCSV('Yes'),
        escapeCSV(''), // madid (empty)
        escapeCSV(fn),
        escapeCSV(ln),
        escapeCSV(zip),
        escapeCSV(ct),
        escapeCSV(st),
        escapeCSV(country),
        escapeCSV(''), // dob (empty)
        escapeCSV(''), // doby (empty)
        escapeCSV(''), // gen (empty)
        escapeCSV(''), // age (empty)
        escapeCSV('')  // uid (empty)
      ];

      csvRows.push(row.join(','));
    });

    const csvContent = csvRows.join('\r\n');
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", url);

    // Create a descriptive file name based on active filters
    let filename = "meta_ads_leads";
    if (stateFilter !== 'All') {
      filename += `_${stateFilter.toLowerCase().replace(/\s+/g, '_')}`;
    }
    if (districtFilter !== 'All') {
      filename += `_${districtFilter.toLowerCase().replace(/\s+/g, '_')}`;
    }
    if (statusFilter !== 'All') {
      filename += `_${statusFilter.toLowerCase().replace(/\s+/g, '_')}`;
    }
    filename += ".csv";

    downloadAnchor.setAttribute("download", filename);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  };

  // Data Import Handler
  const handleImportData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsLoading(true);

        // Refresh and verify session (handles 8-hour login token expiry)
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        if (sessionError || !session) {
          throw new Error("Your login session has expired. Please log out and log in again to import backup logs.");
        }

        const rawText = evt.target.result;
        let imported;
        try {
          imported = JSON.parse(rawText);
        } catch (parseErr) {
          throw new Error('Invalid JSON format. Please upload a valid backup JSON file.');
        }

        if (!imported.callLogs) {
          alert('Invalid file format. Import requires a file exported from this application.');
          setIsLoading(false);
          return;
        }

        const logsToInsert = [];
        
        // Loop through exported call logs
        for (const [vendorId, logsArray] of Object.entries(imported.callLogs)) {
          // Find matching vendor ID in database
          const targetVendor = vendors.find(v => String(v.id) === String(vendorId));
          if (!targetVendor) continue;

          logsArray.forEach(log => {
            logsToInsert.push({
              vendor_id: targetVendor.id,
              timestamp: log.timestamp,
              outcome: log.outcome,
              note: log.note,
              follow_up_date: log.followUpDate || null,
              user_id: session.user.id
            });
          });
        }

        if (logsToInsert.length > 0) {
          if (window.confirm(`Upload ${logsToInsert.length} imported logs to your cloud account?`)) {
            const { error } = await supabase.from('call_logs').insert(logsToInsert);
            if (error) throw error;
            alert('Import completed successfully!');
            await fetchData();
          }
        } else {
          alert('No matching vendors found to apply these logs.');
        }

      } catch (err) {
        console.error(err);
        alert(err.message || 'Failed to read import file. Make sure it is a valid JSON file.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsText(file);
  };


  // Month navigation helpers
  const handlePrevMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1));
  };
  
  const handleNextMonth = () => {
    setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1));
  };

  const handlePrevDemoMonth = () => {
    setDemoCalendarDate(new Date(demoCalendarDate.getFullYear(), demoCalendarDate.getMonth() - 1, 1));
  };
  
  const handleNextDemoMonth = () => {
    setDemoCalendarDate(new Date(demoCalendarDate.getFullYear(), demoCalendarDate.getMonth() + 1, 1));
  };

  const getMonthName = (date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // --- RENDER LOGIN GATES ---
  if (!isAuthenticated) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', width: '100vw', padding: '20px' }}>
        <div className="glass-panel animate-fade-in" style={{ width: '100%', maxWidth: '420px', padding: '32px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', padding: '12px', borderRadius: '16px', boxShadow: 'var(--shadow-glow-cyan)', display: 'inline-flex' }}>
              <Sun className="pulse-icon" style={{ color: 'white', width: '28px', height: '28px' }} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: '800', background: 'linear-gradient(135deg, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Solar Ahmedabad CRM</h2>
              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Cloud Database System</span>
            </div>
          </div>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Email Address</label>
              <input 
                type="email" 
                required
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="email@example.com"
                className="input-field"
                style={{ fontSize: '0.9rem' }}
                disabled={isLoading}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Password</label>
              <input 
                type="password" 
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field"
                style={{ fontSize: '0.9rem' }}
                disabled={isLoading}
              />
            </div>

            {loginError && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', borderRadius: '8px', color: 'var(--status-uninterested)', fontSize: '0.8rem' }}>
                <AlertTriangle size={14} flexShrink={0} />
                <span>{loginError}</span>
              </div>
            )}

            <button type="submit" disabled={isLoading} className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px', borderRadius: '10px', marginTop: '5px' }}>
              {isLoading ? <Loader2 size={16} className="animate-spin" /> : <><Lock size={16} /> Enter CRM</>}
            </button>
          </form>


        </div>
      </div>
    );
  }

  // --- RENDER MAIN CRM ---
  return (
    <>
      {/* Sidebar Backdrop Overlay */}
      <div className={`sidebar-backdrop ${isSidebarOpen ? 'show' : ''}`} onClick={() => setIsSidebarOpen(false)} />
      
      <div className="app-container">
        
        {/* --- Sidebar Navigation & Branding --- */}
        <aside className={`glass-panel sidebar ${isSidebarOpen ? 'open' : ''}`} style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px', minWidth: '240px' }}>
        <div className="branding" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ background: 'linear-gradient(135deg, var(--accent-cyan), var(--accent-blue))', padding: '10px', borderRadius: '12px', boxShadow: 'var(--shadow-glow-cyan)' }}>
            <Sun className="pulse-icon" style={{ color: 'white', width: '24px', height: '24px' }} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: '800', letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #fff, var(--text-muted))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Solar Ahmedabad</h2>
            <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', fontWeight: '600', textTransform: 'uppercase' }}>CRM Dashboard</span>
          </div>
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, marginTop: '20px' }}>
          <button 
            onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} 
            className={`nav-btn ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            <Activity size={18} /> Dashboard
          </button>
          
          <button 
            onClick={() => { setActiveTab('directory'); setIsSidebarOpen(false); }} 
            className={`nav-btn ${activeTab === 'directory' ? 'active' : ''}`}
          >
            <Users size={18} /> Directory ({filteredVendors.length})
          </button>

          <button 
            onClick={() => { setActiveTab('timeline'); setIsSidebarOpen(false); }} 
            className={`nav-btn ${activeTab === 'timeline' ? 'active' : ''}`}
          >
            <Clock size={18} /> Daily Uploads
          </button>
          
          <button 
            onClick={() => { setActiveTab('calendar'); setIsSidebarOpen(false); }} 
            className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
          >
            <Calendar size={18} /> Calendar View
            {stats.todayFollowUps > 0 && (
              <span className="nav-badge" style={{ backgroundColor: 'var(--accent-pink)' }}>
                {stats.todayFollowUps}
              </span>
            )}
          </button>

          <button 
            onClick={() => { setActiveTab('democalendar'); setIsSidebarOpen(false); }} 
            className={`nav-btn ${activeTab === 'democalendar' ? 'active' : ''}`}
          >
            <Video size={18} style={{ color: 'var(--accent-purple)' }} /> Demo Calendar
            {stats.todayDemos > 0 && (
              <span className="nav-badge" style={{ backgroundColor: 'var(--accent-purple)', color: 'white' }}>
                {stats.todayDemos}
              </span>
            )}
          </button>
          
          {(userRole === 'admin' || (user && user.email?.toLowerCase() === 'vedant@vijapur.in')) && (
            <button 
              onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
              className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
            >
              <FileText size={18} /> Database Admin
            </button>
          )}

          {/* Logout Button */}
          <button 
            onClick={handleLogout} 
            className="nav-btn"
            style={{ marginTop: 'auto', borderTop: '1px solid var(--border-glass)', borderRadius: 0, paddingTop: '16px', color: 'var(--status-uninterested)' }}
          >
            <LogOut size={18} /> Log Out ({user.email})
          </button>
        </nav>

        <div className="sidebar-footer" style={{ paddingTop: '15px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
            <span>Database Count:</span>
            <span style={{ color: 'var(--text-primary)', fontWeight: '600' }}>{stats.total}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Total Contacted:</span>
            <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>{stats.called} ({((stats.called / (stats.total || 1)) * 100).toFixed(0)}%)</span>
          </div>
        </div>
      </aside>

      {/* --- Main Dashboard Area --- */}
      <main className="app-main" style={{ display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto', paddingRight: '4px' }}>
        
        {/* --- Header Section --- */}
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            {/* Mobile Sidebar Hamburger Toggle */}
            <button 
              className="mobile-menu-toggle"
              onClick={() => setIsSidebarOpen(true)}
              style={{
                padding: '10px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--border-glass)',
                borderRadius: '10px',
                color: 'var(--text-primary)',
              }}
            >
              <Menu size={20} />
            </button>
            
            <div>
              <span style={{ textTransform: 'uppercase', fontSize: '0.75rem', letterSpacing: '0.05em', color: 'var(--accent-cyan)', fontWeight: '600' }}>Ahmedabad Division</span>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {activeTab === 'dashboard' && "Activity Dashboard"}
                {activeTab === 'directory' && "Vendor Directory"}
                {activeTab === 'timeline' && "Daily Uploads & Registrations"}
                {activeTab === 'calendar' && "Follow-Up Calendar"}
                {activeTab === 'democalendar' && "Demo Calendar"}
                {activeTab === 'settings' && "Database Management"}
                {isLoading && <Loader2 className="animate-spin" style={{ color: 'var(--accent-cyan)', width: '20px', height: '20px' }} />}
              </h1>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            {/* Display today's date */}
            <div className="glass-panel" style={{ padding: '8px 16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <Clock size={16} style={{ color: 'var(--accent-cyan)' }} />
              <span className="header-date">Today: {new Date().toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
            </div>
          </div>
        </header>

        {/* --- Tab Panels --- */}
        
        {/* --- PANEL: DASHBOARD --- */}
        {activeTab === 'dashboard' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Stats Cards Row */}
            <section className="stats-row" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
              <div className="glass-panel stat-card">
                <span className="stat-label">Total Leads Loaded</span>
                <span className="stat-value">{stats.total}</span>
                <span className="stat-desc">Cloud Database</span>
              </div>
              <div className="glass-panel stat-card">
                <span className="stat-label">Total Calls Logged</span>
                <span className="stat-value" style={{ color: 'var(--accent-cyan)' }}>{stats.called}</span>
                <span className="stat-desc">{((stats.called / (stats.total || 1)) * 100).toFixed(1)}% of total list</span>
              </div>
              <div className="glass-panel stat-card">
                <span className="stat-label">Interested Clients</span>
                <span className="stat-value" style={{ color: 'var(--status-interested)' }}>{stats.interested}</span>
                <span className="stat-desc">High priority prospects</span>
              </div>
              <div className="glass-panel stat-card highlight">
                <span className="stat-label">Today's Follow-ups</span>
                <span className="stat-value" style={{ color: 'var(--accent-pink)' }}>{stats.todayFollowUps}</span>
                <span className="stat-desc">Scheduled for today</span>
              </div>
              <div className="glass-panel stat-card" style={{ borderLeft: '3px solid var(--accent-purple)' }}>
                <span className="stat-label">Demos Scheduled</span>
                <span className="stat-value" style={{ color: 'var(--accent-purple)' }}>{stats.demoScheduled}</span>
                <span className="stat-desc">Active demo pipeline</span>
              </div>
            </section>

            {/* Main Dashboard Layout */}
            <div className="dashboard-grid">              {/* Left Column: Follow-ups and New Registrations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Card 1: Today's Follow-up list */}
                <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '300px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <CheckCircle style={{ color: 'var(--accent-cyan)' }} size={20} />
                      <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Scheduled Follow-Ups for Today</h3>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <select
                        value={followUpFilter}
                        onChange={(e) => setFollowUpFilter(e.target.value)}
                        className="input-field"
                        style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-glass)', height: '28px', cursor: 'pointer' }}
                      >
                        <option value="All">All Follow-ups</option>
                        <option value="Mine">My Follow-ups</option>
                      </select>
                      <span className="badge badge-callback" style={{ fontSize: '0.7rem' }}>{filteredTodayFollowUps.length} PENDING</span>
                    </div>
                  </div>

                  {filteredTodayFollowUps.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', gap: '10px', padding: '40px 0' }}>
                      <Check style={{ width: '48px', height: '48px', color: 'var(--status-interested)', opacity: 0.6 }} />
                      <p>No follow-ups scheduled for today. Awesome!</p>
                      <button onClick={() => setActiveTab('directory')} className="btn-secondary" style={{ fontSize: '0.85rem' }}>Find leads to call</button>
                    </div>
                  ) : (
                    <div className="scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '6px' }}>
                      {filteredTodayFollowUps.map(vendor => (
                        <div key={vendor.id} className="follow-up-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: '700', fontSize: '1rem' }}>{vendor.vendor_name}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center' }}>
                              📞 {vendor.contact_person_name || 'Not Listed'} ({vendor.contact_person_mobile || 'No Phone'})
                              {vendor.contact_person_mobile && (
                                <a 
                                  href={getWhatsAppUrl(vendor.contact_person_mobile)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  title="Send WhatsApp Message"
                                  className="whatsapp-icon-inline"
                                >
                                  <WhatsAppIcon size={12} />
                                </a>
                              )}
                            </span>
                            {vendor.logs.length > 0 && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', fontStyle: 'italic', background: 'rgba(6, 182, 212, 0.05)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid var(--accent-cyan)', marginTop: '6px' }}>
                                Last Note: "{vendor.logs[0].note}"
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={() => handleOpenCallModal(vendor)} 
                            className="btn-primary" 
                            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
                          >
                            <Phone size={14} /> Call & Log
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Card 1b: Scheduled Demos for Today */}
                <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '200px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Video style={{ color: 'var(--accent-purple)' }} size={20} />
                      <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Scheduled Demos for Today</h3>
                    </div>
                    <span className="badge badge-demo" style={{ fontSize: '0.7rem' }}>{todayDemoVendors.length} TODAY</span>
                  </div>

                  {todayDemoVendors.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)', gap: '10px', padding: '30px 0' }}>
                      <Video style={{ width: '40px', height: '40px', color: 'var(--accent-purple)', opacity: 0.5 }} />
                      <p style={{ fontSize: '0.85rem' }}>No demos scheduled for today.</p>
                    </div>
                  ) : (
                    <div className="scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
                      {todayDemoVendors.map(vendor => (
                        <div key={`demo-${vendor.id}`} className="follow-up-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>{vendor.vendor_name}</span>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              📞 {vendor.contact_person_name || 'Not Listed'} ({vendor.contact_person_mobile || 'No Phone'})
                              {vendor.contact_person_mobile && (
                                <a 
                                  href={getWhatsAppUrl(vendor.contact_person_mobile)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  title="Send WhatsApp Message"
                                  className="whatsapp-icon-inline"
                                >
                                  <WhatsAppIcon size={12} />
                                </a>
                              )}
                            </span>
                            {vendor.logs.length > 0 && (
                              <span style={{ fontSize: '0.8rem', color: 'var(--accent-purple)', fontStyle: 'italic', background: 'rgba(139, 92, 246, 0.05)', padding: '6px 10px', borderRadius: '6px', borderLeft: '3px solid var(--accent-purple)', marginTop: '6px' }}>
                                Last Note: "{vendor.logs[0].note}"
                              </span>
                            )}
                          </div>
                          <button 
                            onClick={() => handleOpenCallModal(vendor)} 
                            className="btn-primary" 
                            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
                          >
                            <Phone size={14} /> Call & Log
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Card 2: Newly Registered Companies */}
                <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '300px' }}>
                  <div 
                    onClick={() => { setActiveTab('timeline'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', cursor: 'pointer' }}
                    title="Click to view all registrations date-wise"
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <UserPlus style={{ color: 'var(--status-interested)' }} size={20} />
                      <h3 style={{ fontSize: '1.2rem', margin: 0 }}>Newly Registered Companies</h3>
                    </div>
                    <span className="badge badge-interested" style={{ fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      LATEST LEADS ➔
                    </span>
                  </div>

                  {newlyRegisteredCompanies.length === 0 ? (
                    <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: 'var(--text-muted)' }}>
                      No new companies found.
                    </div>
                  ) : (
                    <div className="scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '400px', overflowY: 'auto', paddingRight: '6px' }}>
                      {newlyRegisteredCompanies.map(vendor => (
                        <div key={`new-${vendor.id}`} className="follow-up-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontWeight: '700', fontSize: '1.05rem' }}>{vendor.vendor_name}</span>
                              <span style={{ fontSize: '0.7rem', padding: '2px 6px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: '600' }}>NEW</span>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              📞 {vendor.contact_person_name || 'Not Listed'} ({vendor.contact_person_mobile || 'No Phone'})
                              {vendor.contact_person_mobile && (
                                <a 
                                  href={getWhatsAppUrl(vendor.contact_person_mobile)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  title="Send WhatsApp Message"
                                  className="whatsapp-icon-inline"
                                >
                                  <WhatsAppIcon size={12} />
                                </a>
                              )}
                            </span>
                            <div style={{ display: 'flex', gap: '8px', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                              <span>📍 {vendor.district ? `${vendor.district}, ${vendor.state}` : vendor.address ? vendor.address.split(',').slice(-2).join(',').trim() : 'No Location'}</span>
                              <span>•</span>
                              <span>⚡ {vendor.nationwise_capacity?.toLocaleString() || 0} kW</span>
                              <span>•</span>
                              <span style={{ color: 'var(--accent-cyan)' }}>Registered: {formatDateTime(vendor.created_at)}</span>
                            </div>
                          </div>
                          <button 
                            onClick={() => handleOpenCallModal(vendor)} 
                            className="btn-primary" 
                            style={{ padding: '8px 14px', borderRadius: '10px', fontSize: '0.85rem' }}
                          >
                            <Phone size={14} /> Call & Log
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>

              {/* Right Column: Mini Calendar / Action Log */}
              <section style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                {/* Stats Breakdown Panel */}
                <div className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                  <h3 style={{ fontSize: '1.1rem', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>Lead Response Pipeline</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Interested Leads</span>
                        <span style={{ fontWeight: '600', color: 'var(--status-interested)' }}>{stats.interested}</span>
                      </div>
                      <div className="progress-bg"><div className="progress-bar" style={{ width: `${(stats.interested / (stats.called || 1)) * 100}%`, backgroundColor: 'var(--status-interested)' }}></div></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Callbacks Scheduled</span>
                        <span style={{ fontWeight: '600', color: 'var(--status-callback)' }}>{stats.callback}</span>
                      </div>
                      <div className="progress-bg"><div className="progress-bar" style={{ width: `${(stats.callback / (stats.called || 1)) * 100}%`, backgroundColor: 'var(--status-callback)' }}></div></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Demos Scheduled</span>
                        <span style={{ fontWeight: '600', color: 'var(--accent-purple)' }}>{stats.demoScheduled}</span>
                      </div>
                      <div className="progress-bg"><div className="progress-bar" style={{ width: `${(stats.demoScheduled / (stats.called || 1)) * 100}%`, backgroundColor: 'var(--accent-purple)' }}></div></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Not Interested</span>
                        <span style={{ fontWeight: '600', color: 'var(--status-uninterested)' }}>{stats.uninterested}</span>
                      </div>
                      <div className="progress-bg"><div className="progress-bar" style={{ width: `${(stats.uninterested / (stats.called || 1)) * 100}%`, backgroundColor: 'var(--status-uninterested)' }}></div></div>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>Pending Calls</span>
                        <span style={{ fontWeight: '600', color: 'var(--text-muted)' }}>{stats.pending}</span>
                      </div>
                      <div className="progress-bg"><div className="progress-bar" style={{ width: `${(stats.pending / (stats.total || 1)) * 100}%`, backgroundColor: 'var(--text-muted)' }}></div></div>
                    </div>
                  </div>
                </div>

                {/* Quick start banner */}
                <div className="glass-panel" style={{ padding: '20px', background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.07), rgba(59, 130, 246, 0.07))', border: '1px solid rgba(6, 182, 212, 0.15)', borderRadius: 'var(--radius-lg)' }}>
                  <h4 style={{ color: 'var(--accent-cyan)', marginBottom: '6px' }}>Ready to dial?</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '12px' }}>
                    Open the vendor directory to search your solar suppliers database, filter by rating, and log updates.
                  </p>
                  <button onClick={() => setActiveTab('directory')} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    Browse Leads Directory
                  </button>
                </div>
              </section>

            </div>

            {/* Location & Capacity Analytics Section */}
            <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Activity size={20} style={{ color: 'var(--accent-cyan)' }} /> Solar Capacity Analytics
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Real-time aggregated installation capacity breakdown at National, State, and District levels.
                  </p>
                </div>
                <div style={{ padding: '8px 16px', borderRadius: '10px', background: 'rgba(6, 182, 212, 0.06)', border: '1px solid rgba(6, 182, 212, 0.15)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>National Capacity: </span>
                  <strong style={{ fontSize: '1.05rem', color: 'var(--accent-cyan)' }}>
                    {mergedVendors.reduce((acc, v) => acc + (parseFloat(v.nationwise_capacity) || 0), 0).toLocaleString()} kW
                  </strong>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                
                {/* State-wise Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>State-wise Capacity</h4>
                    <button 
                      onClick={() => setDashboardStateSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Sort: {dashboardStateSortOrder === 'desc' ? 'High to Low (↓)' : 'Low to High (↑)'}
                    </button>
                  </div>
                  
                  <div className="scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
                    {sortedDashboardStates.map(item => (
                      <div key={item.state} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.state}</span>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.leadsCount} leads</span>
                        </div>
                        <span style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{item.totalCapacity.toLocaleString()} kW</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* District-wise Breakdown */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>District-wise (</h4>
                      <select 
                        value={dashboardSelectedState}
                        onChange={(e) => setDashboardSelectedState(e.target.value)}
                        className="input-field"
                        style={{ padding: '2px 8px', fontSize: '0.75rem', width: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-glass)', height: '24px', cursor: 'pointer', fontWeight: '600', color: 'var(--accent-cyan)' }}
                      >
                        {capacityStats.stateList.map(item => (
                          <option key={item.state} value={item.state}>{item.state}</option>
                        ))}
                      </select>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>)</h4>
                    </div>
                    <button 
                      onClick={() => setDashboardDistrictSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                      className="btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px' }}
                    >
                      Sort: {dashboardDistrictSortOrder === 'desc' ? 'High to Low (↓)' : 'Low to High (↑)'}
                    </button>
                  </div>
                  
                  <div className="scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '6px' }}>
                    {sortedDashboardDistricts.length === 0 ? (
                      <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                        No districts found for this state.
                      </div>
                    ) : (
                      sortedDashboardDistricts.map(item => (
                        <div key={item.district} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: '600', fontSize: '0.9rem' }}>{item.district}</span>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{item.leadsCount} leads</span>
                          </div>
                          <span style={{ fontWeight: '700', color: 'var(--accent-cyan)' }}>{item.totalCapacity.toLocaleString()} kW</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>
            </section>

            {/* Sync Growth & Installation Tracker */}
            <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <TrendingUp size={20} style={{ color: 'var(--status-interested)' }} /> Sync Comparison & Growth Tracker
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '4px 0 0 0' }}>
                    Compare installations and solar capacities between any two upload/sync dates.
                  </p>
                </div>

                {/* Date Selection Dropdowns */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>From:</span>
                    <select
                      value={growthStartDate}
                      onChange={(e) => setGrowthStartDate(e.target.value)}
                      className="input-field"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', height: '32px', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      {availableDates.map(d => (
                        <option key={`start-${d}`} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>To:</span>
                    <select
                      value={growthEndDate}
                      onChange={(e) => setGrowthEndDate(e.target.value)}
                      className="input-field"
                      style={{ padding: '4px 8px', fontSize: '0.8rem', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px solid var(--border-glass)', height: '32px', cursor: 'pointer', color: 'var(--text-primary)' }}
                    >
                      {availableDates.map(d => (
                        <option key={`end-${d}`} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {availableDates.length < 2 ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.01)', borderRadius: '12px', border: '1px dashed var(--border-glass)' }}>
                  <TrendingUp size={36} style={{ marginBottom: '10px', opacity: 0.5, color: 'var(--text-muted)' }} />
                  <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: '700', color: 'var(--text-secondary)' }}>No Historical Sync Data Found</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem' }}>
                    Seeding local JSON data or uploading new JSON updates will automatically record snapshots. Upload multiple updates to track capacity growth over time.
                  </p>
                </div>
              ) : !growthComparison ? (
                <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  Please select valid Start and End dates to calculate growth.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  
                  {/* Growth Summary Cards */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
                    
                    <div style={{ padding: '16px', borderRadius: '12px', background: getGrowthColor(growthComparison.nationwise.capacityGrowth) === '#ef4444' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)' : 'linear-gradient(135deg, rgba(16, 185, 129, 0.08) 0%, rgba(16, 185, 129, 0.02) 100%)', border: getGrowthColor(growthComparison.nationwise.capacityGrowth) === '#ef4444' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(16, 185, 129, 0.15)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>National Capacity Growth</span>
                      <strong style={{ fontSize: '1.4rem', color: getGrowthColor(growthComparison.nationwise.capacityGrowth, '#10b981'), display: 'block' }}>
                        {formatGrowthValue(growthComparison.nationwise.capacityGrowth)} kW
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Capacity went from {growthComparison.nationwise.startCapacity.toLocaleString()} kW to {growthComparison.nationwise.endCapacity.toLocaleString()} kW
                      </span>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '12px', background: getGrowthColor(growthComparison.nationwise.installGrowth) === '#ef4444' ? 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.02) 100%)' : 'linear-gradient(135deg, rgba(6, 182, 212, 0.08) 0%, rgba(6, 182, 212, 0.02) 100%)', border: getGrowthColor(growthComparison.nationwise.installGrowth) === '#ef4444' ? '1px solid rgba(239, 68, 68, 0.15)' : '1px solid rgba(6, 182, 212, 0.15)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>New Installations Added</span>
                      <strong style={{ fontSize: '1.4rem', color: getGrowthColor(growthComparison.nationwise.installGrowth, 'var(--accent-cyan)'), display: 'block' }}>
                        {formatGrowthValue(growthComparison.nationwise.installGrowth)} installs
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Installations went from {growthComparison.nationwise.startInstalls} to {growthComparison.nationwise.endInstalls}
                      </span>
                    </div>

                    <div style={{ padding: '16px', borderRadius: '12px', background: 'linear-gradient(135deg, rgba(236, 72, 153, 0.08) 0%, rgba(236, 72, 153, 0.02) 100%)', border: '1px solid rgba(236, 72, 153, 0.15)' }}>
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Active Growing Vendors</span>
                      <strong style={{ fontSize: '1.4rem', color: 'var(--accent-pink)', display: 'block' }}>
                        {growthComparison.vendorsGrowth.filter(vg => vg.instDiff > 0 || vg.capDiff > 0).length} vendors
                      </strong>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Vendors recorded increases in installation metrics
                      </span>
                    </div>

                  </div>

                  {/* Growth Breakdown Tables */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '24px' }}>
                    
                    {/* Vendors Growth Table */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        🏢 Top Growing Vendors
                      </h4>
                      
                      <div className="scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '320px', overflowY: 'auto', paddingRight: '6px' }}>
                        {growthComparison.vendorsGrowth.length === 0 ? (
                          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                            No vendor records changed between these two dates.
                          </div>
                        ) : (
                          growthComparison.vendorsGrowth.map(item => {
                            const vendorObj = mergedVendors.find(v => v.id === item.id);
                            return (
                              <div 
                                key={`growth-${item.id}`} 
                                onClick={() => {
                                  if (vendorObj) {
                                    handleOpenCallModal(vendorObj);
                                  }
                                }}
                                style={{ 
                                  display: 'flex', 
                                  justifyContent: 'space-between', 
                                  alignItems: 'center', 
                                  padding: '12px 16px', 
                                  background: 'rgba(255, 255, 255, 0.02)', 
                                  borderRadius: '8px', 
                                  border: '1px solid var(--border-glass)',
                                  cursor: vendorObj ? 'pointer' : 'default',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  if (vendorObj) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
                                    e.currentTarget.style.borderColor = 'var(--accent-cyan)';
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  if (vendorObj) {
                                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)';
                                    e.currentTarget.style.borderColor = 'var(--border-glass)';
                                  }
                                }}
                              >
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '65%' }}>
                                  <span style={{ fontWeight: '700', fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {item.vendor_name}
                                  </span>
                                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                    {item.address ? item.address.split(',').slice(-2).join(',').trim() : 'No Address'}
                                  </span>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                  <span style={{ fontSize: '0.85rem', fontWeight: '700', color: getGrowthColor(item.capDiff, '#10b981') }}>
                                    {formatGrowthValue(item.capDiff)} kW
                                  </span>
                                  <span style={{ fontSize: '0.75rem', padding: '2px 6px', borderRadius: '4px', background: getGrowthColor(item.instDiff) === '#ef4444' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(6, 182, 212, 0.1)', color: getGrowthColor(item.instDiff, 'var(--accent-cyan)'), fontWeight: '600' }}>
                                    {formatGrowthValue(item.instDiff)} installs
                                  </span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Regional Performance Metrics */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <h4 style={{ fontSize: '1rem', fontWeight: '700', margin: 0 }}>
                        📍 Regional Growth Contribution
                      </h4>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '20px', background: 'rgba(255, 255, 255, 0.01)', borderRadius: '12px', border: '1px solid var(--border-glass)', justifyContent: 'center', flex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>State-wide Capacity Growth:</span>
                          <strong style={{ fontSize: '0.9rem', color: getGrowthColor(growthComparison.statewise.capacityGrowth, 'var(--accent-cyan)') }}>
                            {formatGrowthValue(growthComparison.statewise.capacityGrowth)} kW ({formatGrowthValue(growthComparison.statewise.installGrowth)} installs)
                          </strong>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '10px' }}>
                          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>District-wide Capacity Growth:</span>
                          <strong style={{ fontSize: '0.9rem', color: getGrowthColor(growthComparison.districtwise.capacityGrowth, 'var(--accent-cyan)') }}>
                            {formatGrowthValue(growthComparison.districtwise.capacityGrowth)} kW ({formatGrowthValue(growthComparison.districtwise.installGrowth)} installs)
                          </strong>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: '1.4', marginTop: '10px' }}>
                          💡 **Tip**: When you upload weekly updates, this section displays which state-registered and district-registered solar installers contributed the most capacity increase.
                        </div>
                      </div>
                    </div>

                  </div>

                </div>
              )}
            </section>

          </div>
        )}

        {/* --- PANEL: DIRECTORY --- */}
        {activeTab === 'directory' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Filters & Search Card */}
            <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              
              {/* Row 1: Search Bar */}
              <div style={{ position: 'relative', width: '100%' }}>
                <Search size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  placeholder="Search by Company Name, Contact Person, Brand, Phone, Address..." 
                  className="input-field"
                  style={{ paddingLeft: '40px', width: '100%' }}
                />
                {searchQuery && (
                  <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '14px', top: '14px', color: 'var(--text-muted)' }}>
                    <X size={16} />
                  </button>
                )}
              </div>

              {/* Row 2: Location and Status Filters */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                  <select 
                    value={statusFilter} 
                    onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
                    className="input-field"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="All">All Statuses</option>
                    <option value="Pending">Pending (Not Called)</option>
                    <option value="Interested">Interested</option>
                    <option value="Callback">Callback Scheduled</option>
                    <option value="Demo Scheduled">Demo Scheduled</option>
                    <option value="Uninterested">Not Interested</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                  <select 
                    value={ratingFilter} 
                    onChange={(e) => { setRatingFilter(e.target.value); setCurrentPage(1); }}
                    className="input-field"
                    style={{ cursor: 'pointer' }}
                  >
                    <option value="All">All Ratings</option>
                    <option value="4.8">4.8★ & Above</option>
                    <option value="4.5">4.5★ & Above</option>
                    <option value="4.0">4.0★ & Above</option>
                    <option value="3.0">3.0★ & Above</option>
                  </select>
                </div>

                {/* State Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                  <select 
                    value={stateFilter} 
                    onChange={(e) => { 
                      setStateFilter(e.target.value); 
                      setDistrictFilter('All');
                      setCurrentPage(1); 
                    }}
                    className="input-field"
                    style={{ cursor: 'pointer' }}
                  >
                    {uniqueStates.map(state => (
                      <option key={state} value={state}>
                        {state === 'All' ? 'All States (Nation-wise)' : state}
                      </option>
                    ))}
                  </select>
                </div>

                {/* District Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <MapPin size={16} style={{ color: 'var(--accent-cyan)', flexShrink: 0 }} />
                  <select 
                    value={districtFilter} 
                    disabled={uniqueDistricts.length <= 1}
                    onChange={(e) => { setDistrictFilter(e.target.value); setCurrentPage(1); }}
                    className="input-field"
                    style={{ cursor: uniqueDistricts.length <= 1 ? 'not-allowed' : 'pointer' }}
                  >
                    {uniqueDistricts.map(dist => (
                      <option key={dist} value={dist}>
                        {dist === 'All' ? 'All Districts' : dist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 3: Sorting Controls */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>Sort Vendors By:</span>
                  
                  <select 
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="input-field"
                    style={{ cursor: 'pointer', padding: '4px 12px', fontSize: '0.85rem', width: 'auto', height: '32px' }}
                  >
                    <option value="capacity_difference">Capacity Growth (Last 2 Syncs)</option>
                    <option value="created_at">Registration Date (Date Added)</option>
                    <option value="nationwise_capacity">Nation-wise Capacity (kW)</option>
                    <option value="statewise_capacity">State-wide Capacity (kW)</option>
                    <option value="districtwise_capacity">District-wide Capacity (kW)</option>
                    <option value="nationwise_installs">Nation-wise Installs</option>
                    <option value="statewise_installs">State-wide Installs</option>
                    <option value="districtwise_installs">District-wide Installs</option>
                    <option value="rating">Rating</option>
                    <option value="consumer_rating_count">Rating Count</option>
                    <option value="vendor_name">Company Name</option>
                  </select>

                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button 
                      onClick={() => setSortOrder('desc')}
                      className="btn-secondary"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '0.8rem', 
                        borderRadius: '6px',
                        background: sortOrder === 'desc' ? 'var(--accent-cyan)' : 'transparent',
                        borderColor: sortOrder === 'desc' ? 'var(--accent-cyan)' : 'var(--border-glass)',
                        color: sortOrder === 'desc' ? 'black' : 'var(--text-primary)',
                        fontWeight: sortOrder === 'desc' ? '700' : 'normal'
                      }}
                    >
                      High to Low (↓)
                    </button>
                    <button 
                      onClick={() => setSortOrder('asc')}
                      className="btn-secondary"
                      style={{ 
                        padding: '6px 12px', 
                        fontSize: '0.8rem', 
                        borderRadius: '6px',
                        background: sortOrder === 'asc' ? 'var(--accent-cyan)' : 'transparent',
                        borderColor: sortOrder === 'asc' ? 'var(--accent-cyan)' : 'var(--border-glass)',
                        color: sortOrder === 'asc' ? 'black' : 'var(--text-primary)',
                        fontWeight: sortOrder === 'asc' ? '700' : 'normal'
                      }}
                    >
                      Low to High (↑)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Found <strong>{filteredVendors.length}</strong> matching leads | Total Capacity: <strong>{totalFilteredCapacity.toLocaleString()} kW</strong> (Page {currentPage}/{totalPages || 1})
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                      onClick={handleExportVCF}
                      className="btn-primary" 
                      style={{ 
                        padding: '6px 14px', 
                        fontSize: '0.8rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                        borderColor: '#10B981',
                        color: 'white',
                        fontWeight: '600'
                      }}
                    >
                      <Download size={14} /> Export Contacts (VCF)
                    </button>
                    <button 
                      onClick={handleExportFacebookCSV}
                      className="btn-primary" 
                      style={{ 
                        padding: '6px 14px', 
                        fontSize: '0.8rem', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        background: 'linear-gradient(135deg, #1877F2 0%, #166FE5 100%)',
                        borderColor: '#1877F2',
                        color: 'white',
                        fontWeight: '600'
                      }}
                    >
                      <Download size={14} /> Export Facebook Ads (CSV)
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* Top Pagination Controls */}
            {totalPages > 1 && (
              <section className="glass-panel" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </section>
            )}

            {/* Directory Cards Grid */}
            {filteredVendors.length === 0 ? (
              <div className="glass-panel" style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
                <AlertTriangle size={32} style={{ marginBottom: '10px', opacity: 0.6 }} />
                <p>No vendors matched your active filters or search terms.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {paginatedVendors.map(vendor => (
                  <div 
                    key={vendor.id} 
                    className="glass-panel vendor-card animate-fade-in" 
                    style={{ 
                      padding: '20px', 
                      display: 'flex', 
                      flexDirection: 'column', 
                      justifyContent: 'space-between', 
                      gap: '15px',
                      borderLeft: vendor.status === 'Interested' ? '4px solid var(--status-interested)' :
                                 vendor.status === 'Callback' ? '4px solid var(--status-callback)' :
                                 vendor.status === 'Demo Scheduled' ? '4px solid var(--status-demo)' :
                                 vendor.status === 'Uninterested' ? '4px solid var(--status-uninterested)' :
                                 '1px solid var(--border-glass)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span className={`badge badge-${vendor.status.toLowerCase()}`}>
                          {vendor.status}
                        </span>
                        
                        <div style={{ display: 'flex', alignItems: 'center', gap: '3px', fontSize: '0.85rem', color: '#fbbf24', fontWeight: '600' }}>
                          <Star size={13} fill="#fbbf24" stroke="none" />
                          <span>{(parseFloat(vendor.rating) || 0).toFixed(1)}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'normal' }}>({vendor.consumer_rating_count || 0})</span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.3', marginBottom: '6px', cursor: 'pointer' }} onClick={() => handleOpenCallModal(vendor)}>
                        {vendor.vendor_name}
                      </h3>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {vendor.vendor_brands_list && vendor.vendor_brands_list.slice(0, 2).map((br, index) => (
                          <span key={index} style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.08)', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>
                            {br}
                          </span>
                        ))}
                        {vendor.assignedName && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', background: 'rgba(236, 72, 153, 0.08)', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }} title={`Assigned to ${vendor.assignedName}`}>
                            👤 {vendor.assignedName}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            Contact: <strong>{vendor.contact_person_name || 'Not Listed'}</strong>
                            {vendor.contact_person_name && (
                              <a 
                                href={`https://www.google.com/search?q=${encodeURIComponent((vendor.vendor_name || '') + ' ' + (vendor.contact_person_name || '') + ' owner linkedin')}`}
                                target="_blank" 
                                rel="noopener noreferrer" 
                                title="Search Owner LinkedIn on Google"
                                style={{ 
                                  color: '#0077B5', 
                                  display: 'inline-flex', 
                                  alignItems: 'center',
                                  opacity: 0.8,
                                  transition: 'opacity 0.2s'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
                              >
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                                </svg>
                              </a>
                            )}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            Phone: <strong style={{ marginLeft: '4px' }}>{vendor.contact_person_mobile || 'Not Listed'}</strong>
                            {vendor.contact_person_mobile && (
                              <a 
                                href={getWhatsAppUrl(vendor.contact_person_mobile)} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                title="Send WhatsApp Message"
                                className="whatsapp-icon-inline"
                              >
                                <WhatsAppIcon size={12} />
                              </a>
                            )}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                          <MapPin size={12} style={{ color: 'var(--text-muted)', marginTop: '2px' }} />
                          <span className="text-truncate" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{vendor.address}</span>
                        </div>
                      </div>

                      {/* Capacities Section */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', borderTop: '1px dashed var(--border-glass)', paddingTop: '10px', marginTop: '10px', fontSize: '0.75rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>🌎 Nation Capacity:</span>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>{vendor.nationwise_capacity?.toLocaleString() || 0} kW ({vendor.nationwise_installs || 0} inst)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>🏛️ State Capacity:</span>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>{vendor.statewise_capacity?.toLocaleString() || 0} kW ({vendor.statewise_installs || 0} inst)</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)' }}>
                          <span>📍 District Capacity:</span>
                          <span style={{ color: 'var(--accent-cyan)', fontWeight: '600' }}>{vendor.districtwise_capacity?.toLocaleString() || 0} kW ({vendor.districtwise_installs || 0} inst)</span>
                        </div>
                        {(sortBy === 'capacity_difference' || (vendor.capacity_difference !== undefined && vendor.capacity_difference !== 0)) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', background: 'rgba(16, 185, 129, 0.05)', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📈 Capacity Growth:</span>
                            <span style={{ color: (vendor.capacity_difference || 0) > 0 ? '#10b981' : (vendor.capacity_difference || 0) < 0 ? '#ef4444' : 'var(--text-secondary)', fontWeight: '700' }}>
                              {(vendor.capacity_difference || 0) > 0 ? '+' : ''}{(vendor.capacity_difference || 0).toLocaleString()} kW
                            </span>
                          </div>
                        )}
                        {(sortBy === 'created_at' || vendor.created_at) && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-secondary)', background: 'rgba(6, 182, 212, 0.05)', padding: '4px 8px', borderRadius: '4px', marginTop: '4px' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>📅 Date Added:</span>
                            <span style={{ color: 'var(--accent-cyan)', fontWeight: '700' }}>
                              {formatDateTime(vendor.created_at)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Footer Actions */}
                    <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                      {vendor.latestFollowUp ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-pink)' }}>
                          <Clock size={12} />
                          <span>Follow up: {vendor.latestFollowUp}</span>
                        </div>
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No follow-up set</span>
                      )}

                      <button 
                        onClick={() => handleOpenCallModal(vendor)} 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem' }}
                      >
                        <Phone size={12} /> Call & Log
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <section className="glass-panel" style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <button 
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', opacity: currentPage === 1 ? 0.5 : 1, cursor: currentPage === 1 ? 'not-allowed' : 'pointer' }}
                >
                  <ChevronLeft size={16} /> Previous
                </button>

                <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                  Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
                </span>

                <button 
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', opacity: currentPage === totalPages ? 0.5 : 1, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer' }}
                >
                  Next <ChevronRight size={16} />
                </button>
              </section>
            )}

          </div>
        )}

        {/* --- PANEL: DAILY REGISTRATIONS TIMELINE --- */}
        {activeTab === 'timeline' && (
          <div className="animate-fade-in timeline-layout">
            
            {/* Left Sidebar: Dates List */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', maxHeight: '75vh', overflowY: 'auto' }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', fontWeight: '800', display: 'flex', alignItems: 'center', gap: '6px' }}><Clock size={18} style={{ color: 'var(--accent-cyan)' }} /> Upload Dates</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Select an upload snapshot date to view registered vendors.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {timelineGroupedVendors.sortedDates.length === 0 ? (
                  <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px 0' }}>No records found</span>
                ) : (
                  timelineGroupedVendors.sortedDates.map(dateKey => {
                    const count = timelineGroupedVendors.groups[dateKey].length;
                    const isSelected = selectedTimelineDate === dateKey;
                    return (
                      <button
                        key={dateKey}
                        onClick={() => setSelectedTimelineDate(dateKey)}
                        className={`btn-secondary`}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '12px 16px',
                          borderRadius: '10px',
                          border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-glass)',
                          background: isSelected ? 'rgba(6, 182, 212, 0.08)' : 'rgba(255,255,255,0.01)',
                          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          fontWeight: isSelected ? '700' : '500',
                          textAlign: 'left',
                          transition: 'all 0.2s ease'
                        }}
                      >
                        <span>{dateKey === 'Unknown' ? 'Unknown Date' : formatDateTime(dateKey)}</span>
                        <span 
                          className="badge" 
                          style={{ 
                            background: isSelected ? 'var(--accent-cyan)' : 'rgba(255,255,255,0.05)', 
                            color: isSelected ? 'black' : 'var(--text-primary)',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                            padding: '2px 8px',
                            borderRadius: '20px'
                          }}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Right Side: Lead Cards list for selected date */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px' }}>
                <div>
                  <h3 style={{ fontSize: '1.25rem', fontWeight: '800' }}>
                    {selectedTimelineDate === 'Unknown' ? 'Unknown Date Registrations' : `Registrations on ${formatDateTime(selectedTimelineDate)}`}
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                    Showing <strong>{(timelineGroupedVendors.groups[selectedTimelineDate] || []).length}</strong> solar companies registered on this day.
                  </p>
                </div>
              </div>

              {/* Vendors list grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
                {(!selectedTimelineDate || !(timelineGroupedVendors.groups[selectedTimelineDate] || []).length) ? (
                  <div className="glass-panel" style={{ padding: '60px 0', display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--text-muted)', gridColumn: '1 / -1' }}>
                    Select a date from the timeline list to view leads.
                  </div>
                ) : (
                  timelineGroupedVendors.groups[selectedTimelineDate].map(vendor => (
                    <div 
                      key={`timeline-vendor-${vendor.id}`} 
                      className="glass-panel follow-up-item" 
                      style={{ 
                        padding: '20px', 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px',
                        borderLeft: '4px solid var(--accent-cyan)',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                          <span style={{ fontWeight: '800', fontSize: '1.1rem', color: 'var(--text-primary)' }}>{vendor.vendor_name}</span>
                          {vendor.assignedName && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-pink)', background: 'rgba(236, 72, 153, 0.08)', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>
                              👤 {vendor.assignedName}
                            </span>
                          )}
                        </div>

                        {/* Details grid */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Users size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>Contact: <strong>{vendor.contact_person_name || 'Not Listed'}</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              Phone: <strong>{vendor.contact_person_mobile || 'Not Listed'}</strong>
                              {vendor.contact_person_mobile && (
                                <a 
                                  href={getWhatsAppUrl(vendor.contact_person_mobile)} 
                                  target="_blank" 
                                  rel="noopener noreferrer" 
                                  title="Send WhatsApp Message"
                                  className="whatsapp-icon-inline"
                                >
                                  <WhatsAppIcon size={12} />
                                </a>
                              )}
                            </span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Sun size={12} style={{ color: 'var(--text-muted)' }} />
                            <span>District Capacity: <strong style={{ color: 'var(--accent-cyan)' }}>{vendor.districtwise_capacity?.toLocaleString() || 0} kW</strong></span>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginTop: '4px' }}>
                            <MapPin size={12} style={{ color: 'var(--text-muted)', marginTop: '2px', flexShrink: 0 }} />
                            <span style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', fontSize: '0.75rem', lineHeight: '1.3' }}>{vendor.address}</span>
                          </div>
                        </div>
                      </div>

                      {/* Call Action */}
                      <div style={{ display: 'flex', borderTop: '1px solid var(--border-glass)', paddingTop: '10px', marginTop: '4px', justifyContent: 'flex-end' }}>
                        <button 
                          onClick={() => handleOpenCallModal(vendor)} 
                          className="btn-primary" 
                          style={{ padding: '6px 12px', borderRadius: '8px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '6px' }}
                        >
                          <Phone size={12} /> Call & Log
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}

        {/* --- PANEL: CALENDAR VIEW --- */}
        {activeTab === 'calendar' && (
          <div className="animate-fade-in calendar-grid">
            
            {/* Calendar Sheet */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem' }}>Scheduled Follow-Ups Calendar</h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={handlePrevMonth} className="btn-secondary" style={{ padding: '8px' }}><ChevronLeft size={16} /></button>
                  <span style={{ fontWeight: '700', minWidth: '150px', textAlign: 'center' }}>{getMonthName(calendarDate)}</span>
                  <button onClick={handleNextMonth} className="btn-secondary" style={{ padding: '8px' }}><ChevronRight size={16} /></button>
                </div>
              </div>

              {/* Grid Header (Days of week) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div>SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
              </div>

              {/* Calendar Grid Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', minHeight: '380px' }}>
                {calendarDays.map((cell, index) => {
                  const dayFollowUps = calendarFollowUpMap[cell.dateString] || [];
                  const isSelected = selectedCalendarDay === cell.dateString;
                  const isToday = cell.dateString === getTodayString();
                  
                  return (
                    <div 
                      key={index} 
                      onClick={() => setSelectedCalendarDay(cell.dateString)}
                      className={`calendar-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      style={{
                        background: isSelected ? 'rgba(6, 182, 212, 0.15)' : 'rgba(255, 255, 255, 0.01)',
                        border: isSelected ? '1px solid var(--accent-cyan)' : isToday ? '1px solid var(--accent-pink)' : '1px solid var(--border-glass)',
                        borderRadius: '10px',
                        padding: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        transition: 'all 0.2s ease',
                        opacity: cell.isCurrentMonth ? 1 : 0.45
                      }}
                    >
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: isToday ? '700' : '500',
                        color: isToday ? 'var(--accent-pink)' : 'var(--text-primary)'
                      }}>
                        {cell.dayNum}
                      </span>

                      {dayFollowUps.length > 0 && (
                        <div style={{ width: '100%', marginTop: '5px' }}>
                          <span 
                            className="badge" 
                            style={{ 
                              width: '100%', 
                              justifyContent: 'center',
                              fontSize: '0.65rem', 
                              padding: '2px 4px', 
                              backgroundColor: 'rgba(236, 72, 153, 0.15)', 
                              color: 'var(--accent-pink)',
                              border: '1px solid rgba(236, 72, 153, 0.3)'
                            }}
                          >
                            {dayFollowUps.length} follow-up{dayFollowUps.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day details Panel */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                    {selectedCalendarDay ? (
                      `Follow-Ups for ${new Date(selectedCalendarDay).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    ) : (
                      "Select a Calendar Day"
                    )}
                  </h3>
                  {selectedCalendarDay === getTodayString() && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', fontWeight: '600', display: 'block', marginTop: '2px' }}>TODAY'S SCHEDULE</span>
                  )}
                </div>
                {selectedCalendarDay && (
                  <select
                    value={followUpFilter}
                    onChange={(e) => setFollowUpFilter(e.target.value)}
                    className="input-field"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-glass)', height: '28px', cursor: 'pointer' }}
                  >
                    <option value="All">All Follow-ups</option>
                    <option value="Mine">My Follow-ups</option>
                  </select>
                )}
              </div>

              {!selectedCalendarDay ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
                  <p>Click any day on the calendar to view scheduled follow-up actions.</p>
                </div>
              ) : filteredSelectedDayVendors.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
                  <p>No follow-ups scheduled for this day.</p>
                </div>
              ) : (
                <div className="scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '450px' }}>
                  {filteredSelectedDayVendors.map(vendor => (
                    <div key={vendor.id} style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{vendor.vendor_name}</span>
                        <span className={`badge badge-${vendor.status.toLowerCase()}`} style={{ fontSize: '0.65rem' }}>{vendor.status}</span>
                      </div>
                      
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'inline-flex', alignItems: 'center' }}>
                        📞 {vendor.contact_person_name || 'Not Listed'} ({vendor.contact_person_mobile || 'No Phone'})
                        {vendor.contact_person_mobile && (
                          <a 
                            href={getWhatsAppUrl(vendor.contact_person_mobile)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            title="Send WhatsApp Message"
                            className="whatsapp-icon-inline"
                          >
                            <WhatsAppIcon size={12} />
                          </a>
                        )}
                      </p>

                      {vendor.logs.length > 0 && (
                        <div style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px', color: 'var(--text-muted)', marginBottom: '10px', borderLeft: '2px solid var(--text-muted)' }}>
                          <strong>Last Update Note:</strong> "{vendor.logs[0].note}"
                        </div>
                      )}

                      <button 
                        onClick={() => handleOpenCallModal(vendor)} 
                        className="btn-primary" 
                        style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%', justifyContent: 'center', borderRadius: '8px' }}
                      >
                        <Phone size={12} /> Call & Log Update
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- PANEL: DEMO CALENDAR VIEW --- */}
        {activeTab === 'democalendar' && (
          <div className="animate-fade-in calendar-grid">
            
            {/* Calendar Sheet */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Video size={20} style={{ color: 'var(--accent-purple)' }} /> Scheduled Demos Calendar
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button onClick={handlePrevDemoMonth} className="btn-secondary" style={{ padding: '8px' }}><ChevronLeft size={16} /></button>
                  <span style={{ fontWeight: '700', minWidth: '150px', textAlign: 'center' }}>{getMonthName(demoCalendarDate)}</span>
                  <button onClick={handleNextDemoMonth} className="btn-secondary" style={{ padding: '8px' }}><ChevronRight size={16} /></button>
                </div>
              </div>

              {/* Grid Header (Days of week) */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', textAlign: 'center', fontWeight: '600', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                <div>SUN</div>
                <div>MON</div>
                <div>TUE</div>
                <div>WED</div>
                <div>THU</div>
                <div>FRI</div>
                <div>SAT</div>
              </div>

              {/* Calendar Grid Cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', minHeight: '380px' }}>
                {demoCalendarDays.map((cell, index) => {
                  const dayDemos = calendarDemoMap[cell.dateString] || [];
                  const isSelected = selectedDemoCalendarDay === cell.dateString;
                  const isToday = cell.dateString === getTodayString();
                  
                  return (
                    <div 
                      key={index} 
                      onClick={() => setSelectedDemoCalendarDay(cell.dateString)}
                      className={`calendar-cell ${cell.isCurrentMonth ? '' : 'other-month'} ${isSelected ? 'selected' : ''} ${isToday ? 'today' : ''}`}
                      style={{
                        background: isSelected ? 'rgba(139, 92, 246, 0.15)' : 'rgba(255, 255, 255, 0.01)',
                        border: isSelected ? '1px solid var(--accent-purple)' : isToday ? '1px solid var(--accent-pink)' : '1px solid var(--border-glass)',
                        borderRadius: '10px',
                        padding: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        transition: 'all 0.2s ease',
                        opacity: cell.isCurrentMonth ? 1 : 0.45
                      }}
                    >
                      <span style={{ 
                        fontSize: '0.9rem', 
                        fontWeight: isToday ? '700' : '500',
                        color: isToday ? 'var(--accent-pink)' : 'var(--text-primary)'
                      }}>
                        {cell.dayNum}
                      </span>

                      {dayDemos.length > 0 && (
                        <div style={{ width: '100%', marginTop: '5px' }}>
                          <span 
                            className="badge" 
                            style={{ 
                              width: '100%', 
                              justifyContent: 'center',
                              fontSize: '0.65rem', 
                              padding: '2px 4px', 
                              backgroundColor: 'rgba(139, 92, 246, 0.15)', 
                              color: 'var(--accent-purple)',
                              border: '1px solid rgba(139, 92, 246, 0.3)'
                            }}
                          >
                            {dayDemos.length} demo{dayDemos.length > 1 ? 's' : ''}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Day details Panel */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>
                    {selectedDemoCalendarDay ? (
                      `Scheduled Demos for ${new Date(selectedDemoCalendarDay).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}`
                    ) : (
                      "Select a Calendar Day"
                    )}
                  </h3>
                  {selectedDemoCalendarDay === getTodayString() && (
                    <span style={{ fontSize: '0.75rem', color: 'var(--accent-purple)', fontWeight: '600', display: 'block', marginTop: '2px' }}>TODAY'S DEMOS</span>
                  )}
                </div>
                {selectedDemoCalendarDay && (
                  <select
                    value={followUpFilter}
                    onChange={(e) => setFollowUpFilter(e.target.value)}
                    className="input-field"
                    style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-glass)', height: '28px', cursor: 'pointer' }}
                  >
                    <option value="All">All Demos</option>
                    <option value="Mine">My Demos</option>
                  </select>
                )}
              </div>

              {!selectedDemoCalendarDay ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
                  <p>Click any day on the calendar to view scheduled demos.</p>
                </div>
              ) : filteredSelectedDemoDayVendors.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '40px 0' }}>
                  <p>No demos scheduled for this day.</p>
                </div>
              ) : (
                <div className="scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', maxHeight: '450px' }}>
                  {filteredSelectedDemoDayVendors.map(vendor => (
                    <div key={vendor.id} style={{ padding: '14px', borderRadius: '10px', background: 'rgba(255, 255, 255, 0.02)', border: '1px solid var(--border-glass)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <span style={{ fontWeight: '700', fontSize: '0.95rem', color: 'var(--text-primary)' }}>{vendor.vendor_name}</span>
                        <span className="badge badge-demo" style={{ fontSize: '0.65rem' }}>Demo Scheduled</span>
                      </div>
                      
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', display: 'inline-flex', alignItems: 'center' }}>
                        📞 {vendor.contact_person_name || 'Not Listed'} ({vendor.contact_person_mobile || 'No Phone'})
                        {vendor.contact_person_mobile && (
                          <a 
                            href={getWhatsAppUrl(vendor.contact_person_mobile)} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            title="Send WhatsApp Message"
                            className="whatsapp-icon-inline"
                          >
                            <WhatsAppIcon size={12} />
                          </a>
                        )}
                      </p>

                      {vendor.logs.length > 0 && (
                        <div style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '8px', borderRadius: '6px', color: 'var(--text-muted)', marginBottom: '10px', borderLeft: '2px solid var(--accent-purple)' }}>
                          <strong>Last Update Note:</strong> "{vendor.logs[0].note}"
                        </div>
                      )}

                      <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid var(--border-glass)', paddingTop: '12px', alignItems: 'center', justifyContent: 'space-between' }}>
                        {vendor.latestFollowUp ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: 'var(--accent-purple)' }}>
                            <Clock size={12} />
                            <span>Demo Date: {vendor.latestFollowUp}</span>
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>No date set</span>
                        )}

                        <button 
                          onClick={() => handleOpenCallModal(vendor)} 
                          className="btn-primary" 
                          style={{ padding: '6px 12px', fontSize: '0.75rem', width: '100%', justifyContent: 'center', borderRadius: '8px' }}
                        >
                          <Phone size={12} /> Call & Log Update
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* --- PANEL: DATABASE ADMIN / SETTINGS --- */}
        {activeTab === 'settings' && (userRole === 'admin' || (user && user.email?.toLowerCase() === 'vedant@vijapur.in')) && (
          <div className="animate-fade-in admin-grid">
            
            {/* Database Admin Card */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><RefreshCw className="pulse-icon" style={{ color: 'var(--accent-cyan)' }} /> Cloud Database Status</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Control and update your cloud records database.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Cloud Database Size</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total unique vendor profiles in database</p>
                  </div>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--accent-cyan)' }}>{vendors.length}</span>
                </div>

                <div className="glass-panel" style={{ padding: '16px', background: 'rgba(255, 255, 255, 0.01)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>Active Call Logs</span>
                    <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total calls documented in cloud</p>
                  </div>
                  <span style={{ fontSize: '1.5rem', fontWeight: '800', color: 'var(--status-interested)' }}>
                    {Object.values(callLogs).reduce((acc, curr) => acc + curr.length, 0)}
                  </span>
                </div>

                {/* Import New JSON file */}
                <div style={{ marginTop: '10px' }}>
                  <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Upload New Database (JSON)
                  </label>
                  <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '10px 16px', borderRadius: '10px' }}>
                      <Upload size={16} /> Choose JSON File
                      <input 
                        type="file" 
                        accept=".json" 
                        onChange={handleJsonUpload} 
                        style={{ display: 'none' }} 
                      />
                    </label>
                    
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Upload and sync your crm database with an external JSON file in-place.</span>
                  </div>
                </div>


              </div>
            </div>

            {/* Import / Export Backup Data */}
            <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}><Download style={{ color: 'var(--accent-cyan)' }} /> Data Backup & Restore</h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Save or load your client history to share or transfer devices.</p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                
                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-glass)', padding: '20px', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Export Backup</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Downloads a `.json` backup file containing your complete logs history, updates, next follow-ups, and lead status pipeline.
                  </p>
                  <button onClick={handleExportData} className="btn-primary" style={{ padding: '8px 16px', fontSize: '0.85rem' }}>
                    <Download size={14} /> Download Backup
                  </button>
                </div>

                <div style={{ background: 'rgba(255, 255, 255, 0.01)', border: '1px dashed var(--border-glass)', padding: '20px', borderRadius: '12px' }}>
                  <h4 style={{ fontSize: '0.95rem', marginBottom: '8px' }}>Import Backup</h4>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Upload a previously downloaded `.json` backup file to restore your logs history. This will merge into your database.
                  </p>
                  <label className="btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '8px 16px', borderRadius: '8px', fontSize: '0.85rem' }}>
                    <Upload size={14} /> Upload Backup JSON
                    <input 
                      type="file" 
                      accept=".json" 
                      onChange={handleImportData} 
                      style={{ display: 'none' }} 
                    />
                  </label>
                </div>

              </div>
            </div>

            {/* Admin-only User Creation Card */}
            {(userRole === 'admin' || (user && user.email?.toLowerCase() === 'vedant@vijapur.in')) && (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2' }}>
                <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                  <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users style={{ color: 'var(--accent-pink)' }} /> Create User Account
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Register a new team member. They will be added to your Supabase Auth list and public profiles.</p>
                </div>

                <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Full Name</label>
                    <input 
                      type="text" 
                      required
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="John Doe"
                      className="input-field"
                      style={{ fontSize: '0.85rem' }}
                      disabled={isLoading}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Email Address</label>
                    <input 
                      type="email" 
                      required
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      className="input-field"
                      style={{ fontSize: '0.85rem' }}
                      disabled={isLoading}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Password</label>
                    <input 
                      type="password" 
                      required
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      placeholder="••••••••"
                      className="input-field"
                      style={{ fontSize: '0.85rem' }}
                      disabled={isLoading}
                    />
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>User Role / Type</label>
                    <select
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      className="input-field"
                      style={{ fontSize: '0.85rem', cursor: 'pointer' }}
                      disabled={isLoading}
                    >
                      <option value="user">Standard User</option>
                      <option value="admin">Admin User</option>
                    </select>
                  </div>

                  <div style={{ gridColumn: 'span 2', display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
                    <button type="submit" disabled={isLoading} className="btn-primary" style={{ padding: '10px 20px', borderRadius: '10px', fontSize: '0.85rem' }}>
                      {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Create Account'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Admin-only User Directory & Settings Card */}
            {(userRole === 'admin' || (user && user.email?.toLowerCase() === 'vedant@vijapur.in')) && (
              <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', gridColumn: 'span 2', marginTop: '10px' }}>
                <div style={{ borderBottom: '1px solid var(--border-glass)', paddingBottom: '10px' }}>
                  <h3 style={{ fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Users style={{ color: 'var(--accent-cyan)' }} /> User Directory & Account Settings
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>View all active user profiles and update password credentials directly.</p>
                </div>

                {/* Users List Table */}
                <div className="scroll-container" style={{ overflowX: 'auto', border: '1px solid var(--border-glass)', borderRadius: '12px', background: 'rgba(255, 255, 255, 0.01)' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                    <thead>
                      <tr style={{ background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid var(--border-glass)' }}>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>Name</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>Email</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)' }}>Role</th>
                        <th style={{ padding: '12px 16px', fontWeight: '600', color: 'var(--text-primary)', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {usersList.map((usr) => (
                        <tr key={usr.id} style={{ borderBottom: '1px solid var(--border-glass)' }}>
                          <td style={{ padding: '12px 16px', fontWeight: '600' }}>{usr.name}</td>
                          <td style={{ padding: '12px 16px', color: 'var(--text-secondary)' }}>{usr.email}</td>
                          <td style={{ padding: '12px 16px' }}>
                            <span 
                              className={`badge badge-${usr.role === 'admin' ? 'callback' : 'interested'}`}
                              style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', textTransform: 'uppercase' }}
                            >
                              {usr.role}
                            </span>
                          </td>
                          <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                            <button
                              onClick={() => {
                                setEditingUser(usr);
                                setNewUserPasswordInput('');
                              }}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '0.75rem', borderRadius: '6px' }}
                            >
                              Reset Password
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Inline Password Change Modal overlay */}
                {editingUser && (
                  <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1001, backdropFilter: 'blur(4px)', WebkitBackdropFilter: 'blur(4px)' }}>
                    <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '400px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
                      <button 
                        onClick={() => setEditingUser(null)}
                        style={{ position: 'absolute', right: '16px', top: '16px', background: 'rgba(255,255,255,0.05)', padding: '6px', borderRadius: '50%', color: 'var(--text-secondary)' }}
                      >
                        <X size={16} />
                      </button>

                      <div>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700' }}>Reset Password</h3>
                        <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '4px' }}>Set a new password for <strong>{editingUser.name}</strong> ({editingUser.email})</p>
                      </div>

                      <form onSubmit={handleAdminChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', fontWeight: '500' }}>New Password</label>
                          <input 
                            type="password" 
                            required
                            value={newUserPasswordInput}
                            onChange={(e) => setNewUserPasswordInput(e.target.value)}
                            placeholder="Min 6 characters"
                            className="input-field"
                            style={{ fontSize: '0.85rem' }}
                            disabled={isLoading}
                          />
                        </div>

                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '5px' }}>
                          <button 
                            type="button" 
                            onClick={() => setEditingUser(null)} 
                            className="btn-secondary" 
                            style={{ padding: '8px 14px', fontSize: '0.8rem' }}
                            disabled={isLoading}
                          >
                            Cancel
                          </button>
                          <button 
                            type="submit" 
                            className="btn-primary" 
                            style={{ padding: '8px 16px', fontSize: '0.8rem' }}
                            disabled={isLoading}
                          >
                            {isLoading ? <Loader2 size={14} className="animate-spin" /> : 'Save Password'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

              </div>
            )}

          </div>
        )}

      </main>

      {/* --- DETAIL & CALL LOGGING MODAL --- */}
      {selectedVendor && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0, 0, 0, 0.65)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000, backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)' }}>
          <div className="glass-panel animate-fade-in" style={{ width: '90%', maxWidth: '680px', maxHeight: '90vh', overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', position: 'relative' }}>
            
            {/* Modal Close Button */}
            <button 
              onClick={() => setSelectedVendor(null)}
              style={{ position: 'absolute', right: '20px', top: '20px', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '50%', color: 'var(--text-secondary)' }}
            >
              <X size={18} />
            </button>

            {/* Modal Header */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span className={`badge badge-${selectedVendor.status.toLowerCase()}`}>
                  {selectedVendor.status}
                </span>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '2px', fontSize: '0.85rem', color: '#fbbf24', fontWeight: '600' }}>
                  <Star size={13} fill="#fbbf24" stroke="none" />
                  <span>{(parseFloat(selectedVendor.rating) || 0).toFixed(1)}</span>
                  <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({selectedVendor.consumer_rating_count || 0})</span>
                </div>
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', paddingRight: '30px' }}>{selectedVendor.vendor_name}</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {selectedVendor.vendor_brands_list && selectedVendor.vendor_brands_list.map((br, index) => (
                  <span key={index} style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.08)', padding: '3px 8px', borderRadius: '4px', fontWeight: '500' }}>
                    {br}
                  </span>
                ))}
                {selectedVendor.assignedName && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-pink)', background: 'rgba(236, 72, 153, 0.08)', padding: '3px 8px', borderRadius: '4px', fontWeight: '500' }}>
                    👤 Assigned to: {selectedVendor.assignedName}
                  </span>
                )}
              </div>
            </div>

            {/* Two Column details */}
            <div className="modal-details-grid" style={{ background: 'rgba(255, 255, 255, 0.01)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-glass)', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Contact Person</span>
                  <p style={{ fontWeight: '600' }}>{selectedVendor.contact_person_name || 'Not Listed'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mobile Number</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <a 
                      href={selectedVendor.contact_person_mobile ? `tel:${selectedVendor.contact_person_mobile}` : '#'} 
                      onClick={(e) => !selectedVendor.contact_person_mobile && e.preventDefault()}
                      style={{ 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px', 
                        color: 'inherit', 
                        textDecoration: 'none', 
                        background: 'rgba(255, 255, 255, 0.04)', 
                        padding: '5px 10px', 
                        borderRadius: '6px', 
                        border: '1px solid var(--border-glass)',
                        fontWeight: '600',
                        fontSize: '0.8rem'
                      }}
                    >
                      <Phone size={12} style={{ color: 'var(--accent-cyan)' }} />
                      <span>{selectedVendor.contact_person_mobile || 'Not Listed'}</span>
                    </a>
                    {selectedVendor.contact_person_mobile && (
                      <a 
                        href={getWhatsAppUrl(selectedVendor.contact_person_mobile)} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        title="Send WhatsApp Message"
                        style={{ 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '6px', 
                          color: '#25D366', 
                          textDecoration: 'none', 
                          background: 'rgba(37, 211, 102, 0.08)', 
                          padding: '5px 10px', 
                          borderRadius: '6px', 
                          border: '1px solid rgba(37, 211, 102, 0.2)',
                          fontWeight: '600',
                          fontSize: '0.8rem',
                          transition: 'all 0.2s ease'
                        }}
                        className="whatsapp-btn"
                      >
                        <WhatsAppIcon size={12} />
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Email Address</span>
                  <p style={{ fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden' }}>{selectedVendor.contact_person_email || 'Not Listed'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Website URL</span>
                  <p style={{ fontWeight: '600' }}>
                    {selectedVendor.website_url ? (
                      <a href={selectedVendor.website_url.startsWith('http') ? selectedVendor.website_url : `https://${selectedVendor.website_url}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {selectedVendor.website_url} <Globe size={11} />
                      </a>
                    ) : (
                      'Not Listed'
                    )}
                  </p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>LinkedIn Search</span>
                  <p style={{ marginTop: '4px' }}>
                    <a 
                      href={`https://www.google.com/search?q=${encodeURIComponent((selectedVendor.vendor_name || '') + ' ' + (selectedVendor.contact_person_name || '') + ' owner linkedin')}`}
                      target="_blank" 
                      rel="noopener noreferrer" 
                      style={{ 
                        color: '#0077B5', 
                        textDecoration: 'none', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        background: 'rgba(0, 119, 181, 0.08)',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontWeight: '600',
                        fontSize: '0.8rem',
                        transition: 'all 0.2s ease',
                        border: '1px solid rgba(0, 119, 181, 0.2)'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 119, 181, 0.15)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 119, 181, 0.08)'}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" style={{ flexShrink: 0 }}>
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.32 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.79M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                      </svg>
                      <span>Find on LinkedIn</span>
                    </a>
                  </p>
                </div>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>🌎 Nation-wise Capacity</span>
                  <p style={{ fontWeight: '600' }}>{selectedVendor.nationwise_capacity?.toLocaleString() || 0} kW ({selectedVendor.nationwise_installs || 0} installs)</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>🏛️ State-wide Capacity</span>
                  <p style={{ fontWeight: '600' }}>{selectedVendor.statewise_capacity?.toLocaleString() || 0} kW ({selectedVendor.statewise_installs || 0} installs)</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>📍 District-wide Capacity</span>
                  <p style={{ fontWeight: '600' }}>{selectedVendor.districtwise_capacity?.toLocaleString() || 0} kW ({selectedVendor.districtwise_installs || 0} installs)</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Address</span>
                  <p style={{ fontWeight: '500', color: 'var(--text-secondary)', lineHeight: '1.3' }}>{selectedVendor.address}</p>
                </div>
              </div>
            </div>

            {/* Log Call Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: 'rgba(6, 182, 212, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid rgba(6, 182, 212, 0.12)' }}>
              <h3 style={{ fontSize: '1.05rem', color: 'var(--accent-cyan)' }}>Log Call Update</h3>
              
              <div className="modal-form-grid">
                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Call Outcome</label>
                  <select 
                    value={callOutcome} 
                    onChange={(e) => setCallOutcome(e.target.value)}
                    className="input-field"
                    style={{ padding: '8px 12px', fontSize: '0.85rem' }}
                  >
                    <option value="Interested">Interested Lead</option>
                    <option value="Callback">Schedule Callback</option>
                    <option value="Demo Scheduled">Demo Scheduled</option>
                    <option value="Uninterested">Not Interested</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                    {callOutcome === 'Demo Scheduled' ? 'Scheduled Demo Date' : 'Next Follow-Up Date'}
                  </label>
                  <input 
                    type="date" 
                    value={customFollowUpDate}
                    onChange={(e) => setCustomFollowUpDate(e.target.value)}
                    className="input-field"
                    style={{ padding: '7px 12px', fontSize: '0.85rem' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Call Update Note</label>
                <textarea 
                  value={callNote}
                  onChange={(e) => setCallNote(e.target.value)}
                  placeholder="Type notes here... Try writing: 'follow up tomorrow' or 'call on June 25' to auto-detect the date."
                  className="input-field"
                  style={{ minHeight: '60px', maxHeight: '120px', resize: 'vertical', fontSize: '0.85rem', padding: '10px' }}
                />
                {autoDateDetected && (
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--status-interested)', fontWeight: '600', marginTop: '6px' }}>
                    💡 Smart Detect: Setting follow-up date to {new Date(autoDateDetected).toLocaleDateString('default', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>

              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '5px' }}>
                <a 
                  href={selectedVendor.contact_person_mobile ? `tel:${selectedVendor.contact_person_mobile}` : '#'}
                  onClick={(e) => {
                    if (!selectedVendor.contact_person_mobile) {
                      e.preventDefault();
                      return;
                    }
                    if (!callNote) setCallNote('Dialed phone number.');
                  }}
                  className="btn-secondary" 
                  style={{ 
                    fontSize: '0.85rem', 
                    display: 'inline-flex', 
                    alignItems: 'center', 
                    gap: '6px', 
                    textDecoration: 'none', 
                    padding: '8px 16px',
                    opacity: selectedVendor.contact_person_mobile ? 1 : 0.5,
                    cursor: selectedVendor.contact_person_mobile ? 'pointer' : 'not-allowed'
                  }}
                >
                  <Phone size={14} /> Open Phone Dialer
                </a>
                
                <button 
                  onClick={handleSaveCallLog} 
                  className="btn-primary" 
                  style={{ fontSize: '0.85rem', padding: '8px 18px' }}
                >
                  Save Call Log
                </button>
              </div>
            </div>

            {/* Call History list */}
            <div>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px' }}>Call History & Logs</h3>
              {selectedVendor.logs.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No previous calls logged for this supplier.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {selectedVendor.logs.map((log, index) => (
                    <div key={log.id || index} style={{ padding: '10px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '0.8rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                          <span className={`badge badge-${log.outcome.toLowerCase()}`} style={{ fontSize: '0.6rem', padding: '2px 6px' }}>{log.outcome}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
                            {new Date(log.timestamp).toLocaleString('default', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {log.userName && (
                            <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.08)', padding: '1px 5px', borderRadius: '3px', fontWeight: '500' }}>
                              By: {log.userName}
                            </span>
                          )}
                        </div>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '4px', lineHeight: '1.3' }}>"{log.note}"</p>
                        {log.followUpDate && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', fontWeight: '500' }}>
                            🗓 Next Follow Up: {log.followUpDate}
                          </span>
                        )}
                      </div>
                      
                      <button 
                        onClick={() => handleDeleteLog(log.id)} 
                        style={{ color: 'var(--text-muted)', padding: '4px' }} 
                        className="hover-red"
                        title="Delete log entry"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vendor Snapshot History */}
            <div style={{ marginTop: '10px' }}>
              <h3 style={{ fontSize: '1.05rem', marginBottom: '8px', borderBottom: '1px solid var(--border-glass)', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <TrendingUp size={16} style={{ color: 'var(--status-interested)' }} /> Capacity & Installation History
              </h3>
              {selectedVendorSnapshots.length === 0 ? (
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '12px 0' }}>No historical capacity snapshots recorded for this supplier.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
                  {selectedVendorSnapshots.map((snap, index) => {
                    // Calculate difference from previous snapshot if exists
                    const prevSnap = selectedVendorSnapshots[index + 1];
                    const capDiff = prevSnap ? snap.nationwise_capacity - prevSnap.nationwise_capacity : 0;
                    const instDiff = prevSnap ? snap.nationwise_installs - prevSnap.nationwise_installs : 0;
                    const stateCapDiff = prevSnap ? snap.statewise_capacity - prevSnap.statewise_capacity : 0;
                    const stateInstDiff = prevSnap ? snap.statewise_installs - prevSnap.statewise_installs : 0;
                    const distCapDiff = prevSnap ? snap.districtwise_capacity - prevSnap.districtwise_capacity : 0;
                    const distInstDiff = prevSnap ? snap.districtwise_installs - prevSnap.districtwise_installs : 0;

                    return (
                      <div key={snap.id || index} style={{ padding: '12px 14px', background: 'rgba(255, 255, 255, 0.01)', border: '1px solid var(--border-glass)', borderRadius: '8px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '0.8rem' }}>
                        <div style={{ fontWeight: '700', color: 'var(--text-primary)', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                          Sync Date: {snap.snapshot_date}
                        </div>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              🌎 Nation: {snap.nationwise_capacity?.toLocaleString()} kW ({snap.nationwise_installs || 0} installs)
                            </span>
                            {prevSnap && (capDiff > 0 || instDiff > 0) && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {capDiff > 0 && <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.75rem' }}>+{capDiff.toLocaleString()} kW</span>}
                                {instDiff > 0 && <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(6, 182, 212, 0.08)', color: 'var(--accent-cyan)', fontWeight: '600' }}>+{instDiff} inst</span>}
                              </div>
                            )}
                          </div>
                          
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              🏛️ State: {snap.statewise_capacity?.toLocaleString()} kW ({snap.statewise_installs || 0} installs)
                            </span>
                            {prevSnap && (stateCapDiff > 0 || stateInstDiff > 0) && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {stateCapDiff > 0 && <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.75rem' }}>+{stateCapDiff.toLocaleString()} kW</span>}
                                {stateInstDiff > 0 && <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(6, 182, 212, 0.08)', color: 'var(--accent-cyan)', fontWeight: '600' }}>+{stateInstDiff} inst</span>}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                              📍 District: {snap.districtwise_capacity?.toLocaleString()} kW ({snap.districtwise_installs || 0} installs)
                            </span>
                            {prevSnap && (distCapDiff > 0 || distInstDiff > 0) && (
                              <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                {distCapDiff > 0 && <span style={{ color: '#10b981', fontWeight: '700', fontSize: '0.75rem' }}>+{distCapDiff.toLocaleString()} kW</span>}
                                {distInstDiff > 0 && <span style={{ fontSize: '0.7rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(6, 182, 212, 0.08)', color: 'var(--accent-cyan)', fontWeight: '600' }}>+{distInstDiff} inst</span>}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
    </>
  );
}

export default App;
