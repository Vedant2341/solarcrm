import React, { useState, useEffect, useMemo } from 'react';
import initialVendors from './data/vendors.json';
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
  Menu
} from 'lucide-react';

// Storage keys for migration fallback
const LOGS_STORAGE_KEY = 'solar_crm_call_logs';
const STATUS_STORAGE_KEY = 'solar_crm_status';

// Guard to prevent double seeding in React StrictMode
let isSeedingActive = false;

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

  // --- Calendar Navigation ---
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(null); // 'YYYY-MM-DD'

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
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user ?? null;
      setUser(u);
      setIsAuthenticated(!!session);
      if (u) {
        upsertProfile(u);
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

  const fetchAllFromTable = async (tableName, selectQuery, orderByField, ascending = true) => {
    let allData = [];
    let hasMore = true;
    let page = 0;
    const pageSize = 1000;

    while (hasMore) {
      const { data: chunk, error } = await supabase
        .from(tableName)
        .select(selectQuery)
        .range(page * pageSize, (page + 1) * pageSize - 1)
        .order(orderByField, { ascending });

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

      // Auto-Seed default vendors if 0 vendors found in database
      if (dbVendors.length === 0) {
        await seedDefaultVendors();
        return; // seedDefaultVendors will re-trigger fetchData when done
      }

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

      if (userRole === 'admin' || user?.email?.toLowerCase() === 'vedant@vijapur.in') {
        await fetchUsersList();
      }

      // 4. Trigger Zero Data Loss Migration (Upload localStorage items if any)
      await migrateLocalStorageData(dbVendors);

    } catch (err) {
      console.error('Error fetching Supabase data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // --- Auto-Seeding: Bulk insert 1799 default vendors to cloud ---
  const seedDefaultVendors = async () => {
    if (isSeedingActive) return;
    isSeedingActive = true;
    try {
      console.log('Seeding 1799 default vendors to cloud...');
      const vendorsToInsert = initialVendors.map(v => ({
        vendor_name: v.vendorName,
        contact_person: v.contactPerson,
        email: v.email,
        mobile: v.mobile,
        address: v.address,
        website: v.website,
        rating: v.rating,
        rating_count: v.ratingCount,
        brand: v.brand,
        capacity: v.capacity,
        install_count: v.installCount,
        user_id: user.id
      }));

      // Insert in chunks of 500 to avoid payload size errors
      const chunkSize = 500;
      for (let i = 0; i < vendorsToInsert.length; i += chunkSize) {
        const chunk = vendorsToInsert.slice(i, i + chunkSize);
        const { error } = await supabase.from('vendors').insert(chunk);
        if (error) throw error;
      }

      console.log('Vendors successfully seeded!');
      // Re-fetch now that database is seeded
      await fetchData();
    } catch (err) {
      console.error('Failed to seed vendors:', err);
      setIsLoading(false);
    } finally {
      isSeedingActive = false;
    }
  };

  // --- Zero Data Loss Migration: Move localStorage logs to Supabase ---
  const migrateLocalStorageData = async (dbVendors) => {
    const localLogsStr = localStorage.getItem(LOGS_STORAGE_KEY);
    if (!localLogsStr) return;

    try {
      const localLogs = JSON.parse(localLogsStr);
      const logsToMigrate = [];

      console.log('Scanning localStorage for local call history to migrate...');

      for (const [localId, logsArray] of Object.entries(localLogs)) {
        // Find local record matching this ID
        const localVendor = initialVendors.find(v => String(v.id) === String(localId));
        if (!localVendor) continue;

        // Match local vendor to newly loaded cloud database vendor (by name or phone)
        const dbVendor = dbVendors.find(dv => 
          dv.vendor_name === localVendor.vendorName ||
          (localVendor.mobile && dv.mobile === localVendor.mobile)
        );

        if (!dbVendor) continue;

        // Map logs
        logsArray.forEach(log => {
          logsToMigrate.push({
            vendor_id: dbVendor.id,
            timestamp: log.timestamp,
            outcome: log.outcome,
            note: log.note,
            follow_up_date: log.followUpDate || null,
            user_id: user.id
          });
        });
      }

      if (logsToMigrate.length > 0) {
        console.log(`Migrating ${logsToMigrate.length} call logs from Local Storage to cloud database...`);
        const { error } = await supabase.from('call_logs').insert(logsToMigrate);
        if (error) throw error;
        console.log('Cloud migration complete!');
      }

      // Safe clean up
      localStorage.removeItem(LOGS_STORAGE_KEY);
      localStorage.removeItem(STATUS_STORAGE_KEY);

      // Re-fetch all data to load profiles, vendors, and call logs correctly in memory
      await fetchData();
      alert(`Data Sync Complete: Successfully uploaded ${logsToMigrate.length} local call logs to your cloud account!`);

    } catch (err) {
      console.error('Local Storage data migration failed:', err);
    }
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
      return {
        ...vendor,
        status,
        latestFollowUp,
        logs,
        assignedName: vendor.profiles?.name || vendor.profiles?.email?.split('@')[0] || null
      };
    });
  }, [vendors, callLogs, vendorStatuses]);

  // --- Filters ---
  const filteredVendors = useMemo(() => {
    return mergedVendors.filter(vendor => {
      const query = searchQuery.toLowerCase();
      const matchesSearch = 
        vendor.vendor_name.toLowerCase().includes(query) ||
        (vendor.contact_person && vendor.contact_person.toLowerCase().includes(query)) ||
        (vendor.mobile && vendor.mobile.toLowerCase().includes(query)) ||
        (vendor.address && vendor.address.toLowerCase().includes(query)) ||
        (vendor.brand && vendor.brand.toLowerCase().includes(query));
      
      if (!matchesSearch) return false;

      if (statusFilter !== 'All' && vendor.status !== statusFilter) return false;

      if (ratingFilter !== 'All') {
        const minRating = parseFloat(ratingFilter);
        if (vendor.rating < minRating) return false;
      }

      return true;
    });
  }, [mergedVendors, searchQuery, statusFilter, ratingFilter]);

  // Paginated vendors for Directory view
  const paginatedVendors = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredVendors.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredVendors, currentPage]);

  const totalPages = Math.ceil(filteredVendors.length / itemsPerPage);

  // --- Stats Computations ---
  const stats = useMemo(() => {
    const total = mergedVendors.length;
    let pending = 0;
    let interested = 0;
    let callback = 0;
    let uninterested = 0;
    let called = 0;
    let todayFollowUps = 0;
    
    const todayStr = getTodayString();

    mergedVendors.forEach(v => {
      if (v.status === 'Pending') pending++;
      else {
        called++;
        if (v.status === 'Interested') interested++;
        if (v.status === 'Callback') callback++;
        if (v.status === 'Uninterested') uninterested++;
      }
      
      if (v.latestFollowUp === todayStr) {
        todayFollowUps++;
      }
    });

    return {
      total,
      pending,
      called,
      interested,
      callback,
      uninterested,
      todayFollowUps
    };
  }, [mergedVendors]);

  // Today's Follow-up vendors
  const todayFollowUpVendors = useMemo(() => {
    const todayStr = getTodayString();
    return mergedVendors.filter(v => v.latestFollowUp === todayStr);
  }, [mergedVendors]);

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
        const rawText = evt.target.result;
        const rawData = JSON.parse(rawText);
        
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

        const uploadedVendors = rawRows.map((row) => {
          // Resolve brand name from nested array
          let brandName = '';
          if (row.brand) {
            brandName = row.brand;
          } else if (Array.isArray(row.vendorBrandsList) && row.vendorBrandsList.length > 0) {
            brandName = row.vendorBrandsList[0].brandName || '';
          }

          // Resolve installation capacity
          let installedCapacity = 0;
          if (row.capacity) {
            installedCapacity = parseFloat(row.capacity) || 0;
          } else if (row.statewiseInstallationAndCapacity) {
            installedCapacity = parseFloat(row.statewiseInstallationAndCapacity.installedCapacity) || 0;
          } else if (row.nationwiseInstallationAndCapacity) {
            installedCapacity = parseFloat(row.nationwiseInstallationAndCapacity.installedCapacity) || 0;
          }

          // Resolve installation count
          let installationCount = 0;
          if (row.install_count) {
            installationCount = parseInt(row.install_count) || 0;
          } else if (row.installCount) {
            installationCount = parseInt(row.installCount) || 0;
          } else if (row.statewiseInstallationAndCapacity) {
            installationCount = parseInt(row.statewiseInstallationAndCapacity.installationCount) || 0;
          } else if (row.nationwiseInstallationAndCapacity) {
            installationCount = parseInt(row.nationwiseInstallationAndCapacity.installationCount) || 0;
          }

          return {
            vendor_name: row.vendorName || row.vendor_name || row.companyName || 'Unknown Vendor',
            contact_person: row.contactPersonName || row.contact_person || row.contactPerson || '',
            email: row.contactPersonEmail || row.email || '',
            mobile: row.contactPersonMobile || row.mobile || row.phone ? String(row.contactPersonMobile || row.mobile || row.phone).trim() : '',
            address: row.address || '',
            website: row.websiteUrl || row.website || '',
            rating: parseFloat(row.rating) || 0,
            rating_count: parseInt(row.consumerRatingCount || row.rating_count || row.ratingCount) || 0,
            brand: brandName,
            capacity: installedCapacity,
            install_count: installationCount,
            user_id: user.id
          };
        });

        const actionChoice = window.prompt(`Parsed ${uploadedVendors.length} vendors.\n\nType "replace" to wipe your database and import, or "append" to add these vendors to your list. Leave blank to cancel:`, "append");
        
        if (!actionChoice) {
          alert("Import cancelled.");
          return;
        }

        const action = actionChoice.trim().toLowerCase();
        if (action !== 'replace' && action !== 'append') {
          alert("Invalid choice. Import cancelled.");
          return;
        }

        let vendorsToInsert = uploadedVendors;
        let skippedCount = 0;

        if (action === 'replace') {
          const doubleCheck = window.confirm("WARNING: Wiping the database will delete ALL existing vendors and ALL of your call history. Are you absolutely sure?");
          if (!doubleCheck) return;

          const { error: dError } = await supabase.from('vendors').delete().eq('user_id', user.id);
          if (dError) throw dError;
        } else if (action === 'append') {
          // De-duplicate: check if vendor name already exists in database
          const existingNames = new Set(
            vendors.map(v => v.vendor_name.trim().toLowerCase())
          );

          vendorsToInsert = uploadedVendors.filter(uv => {
            const nameKey = uv.vendor_name.trim().toLowerCase();
            if (existingNames.has(nameKey)) {
              skippedCount++;
              return false;
            }
            return true;
          });

          if (vendorsToInsert.length === 0) {
            alert('All uploaded vendors already exist in your database! No new vendors were added.');
            return;
          }
        }

        // Bulk insert in chunks of 500
        const chunkSize = 500;
        for (let i = 0; i < vendorsToInsert.length; i += chunkSize) {
          const chunk = vendorsToInsert.slice(i, i + chunkSize);
          const { error: iError } = await supabase.from('vendors').insert(chunk);
          if (iError) throw iError;
        }

        if (action === 'replace') {
          alert('Online database replaced successfully!');
        } else {
          alert(`Import complete! ${vendorsToInsert.length} vendors added to your database. ${skippedCount} duplicate vendors were skipped.`);
        }

        setCurrentPage(1);
        await fetchData();
      } catch (err) {
        console.error(err);
        alert('Failed to import JSON data. Ensure the JSON file is valid.');
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

  // Data Import Handler
  const handleImportData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setIsLoading(true);
        const imported = JSON.parse(evt.target.result);
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
              user_id: user.id
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
        alert('Failed to read import file. Make sure it is a valid JSON file.');
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

          <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            <span>Connects directly to your Supabase Cloud Database.</span>
          </div>

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
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }} 
            className={`nav-btn ${activeTab === 'settings' ? 'active' : ''}`}
          >
            <FileText size={18} /> Database Admin
          </button>

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
                {activeTab === 'calendar' && "Follow-Up Calendar"}
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
            </section>

            {/* Main Dashboard Layout */}
            <div className="dashboard-grid">
              
              {/* Left Column: Today's Follow-up list */}
              <section className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '15px', minHeight: '400px' }}>
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
                  <div className="scroll-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '420px', overflowY: 'auto', paddingRight: '6px' }}>
                    {filteredTodayFollowUps.map(vendor => (
                      <div key={vendor.id} className="follow-up-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid var(--border-glass)' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          <span style={{ fontWeight: '700', fontSize: '1rem' }}>{vendor.vendor_name}</span>
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'inline-flex', alignItems: 'center' }}>
                            📞 {vendor.contact_person} ({vendor.mobile})
                            {vendor.mobile && (
                              <a 
                                href={getWhatsAppUrl(vendor.mobile)} 
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

          </div>
        )}

        {/* --- PANEL: DIRECTORY --- */}
        {activeTab === 'directory' && (
          <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Filters & Search Card */}
            <section className="glass-panel" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div className="filter-grid">
                <div style={{ position: 'relative' }}>
                  <Search size={16} style={{ position: 'absolute', left: '14px', top: '14px', color: 'var(--text-muted)' }} />
                  <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                    placeholder="Search by Company Name, Contact Person, Brand, Phone, Address..." 
                    className="input-field"
                    style={{ paddingLeft: '40px' }}
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: '14px', top: '14px', color: 'var(--text-muted)' }}>
                      <X size={16} />
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} style={{ color: 'var(--accent-cyan)' }} />
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
                    <option value="Uninterested">Not Interested</option>
                  </select>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Star size={16} style={{ color: 'var(--accent-cyan)' }} />
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border-glass)', paddingTop: '10px' }}>
                <span>Found <strong>{filteredVendors.length}</strong> matching solar vendors</span>
                <span>Page {currentPage} of {totalPages || 1}</span>
              </div>
            </section>

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
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 'normal' }}>({vendor.rating_count || 0})</span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: '1.05rem', fontWeight: '700', lineHeight: '1.3', marginBottom: '6px', cursor: 'pointer' }} onClick={() => handleOpenCallModal(vendor)}>
                        {vendor.vendor_name}
                      </h3>

                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' }}>
                        {vendor.brand && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.08)', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }}>
                            {vendor.brand}
                          </span>
                        )}
                        {vendor.assignedName && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--accent-pink)', background: 'rgba(236, 72, 153, 0.08)', padding: '2px 8px', borderRadius: '4px', fontWeight: '500' }} title={`Assigned to ${vendor.assignedName}`}>
                            👤 {vendor.assignedName}
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Users size={12} style={{ color: 'var(--text-muted)' }} />
                          <span>Contact: <strong>{vendor.contact_person || 'Not Listed'}</strong></span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <Phone size={12} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ display: 'inline-flex', alignItems: 'center' }}>
                            Phone: <strong style={{ marginLeft: '4px' }}>{vendor.mobile || 'Not Listed'}</strong>
                            {vendor.mobile && (
                              <a 
                                href={getWhatsAppUrl(vendor.mobile)} 
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
                        📞 {vendor.contact_person} ({vendor.mobile})
                        {vendor.mobile && (
                          <a 
                            href={getWhatsAppUrl(vendor.mobile)} 
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

        {/* --- PANEL: DATABASE ADMIN / SETTINGS --- */}
        {activeTab === 'settings' && (
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
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Supports JSON array of vendors (vendorName, contactPerson, mobile, etc.)</span>
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
                  <span style={{ color: 'var(--text-muted)', fontWeight: 'normal' }}>({selectedVendor.rating_count || 0})</span>
                </div>
              </div>

              <h2 style={{ fontSize: '1.4rem', fontWeight: '800', paddingRight: '30px' }}>{selectedVendor.vendor_name}</h2>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                {selectedVendor.brand && (
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-cyan)', background: 'rgba(6, 182, 212, 0.08)', padding: '3px 8px', borderRadius: '4px', fontWeight: '500' }}>
                    Brand: {selectedVendor.brand}
                  </span>
                )}
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
                  <p style={{ fontWeight: '600' }}>{selectedVendor.contact_person || 'Not Listed'}</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Mobile Number</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                    <a 
                      href={selectedVendor.mobile ? `tel:${selectedVendor.mobile}` : '#'} 
                      onClick={(e) => !selectedVendor.mobile && e.preventDefault()}
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
                      <span>{selectedVendor.mobile || 'Not Listed'}</span>
                    </a>
                    {selectedVendor.mobile && (
                      <a 
                        href={getWhatsAppUrl(selectedVendor.mobile)} 
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
                  <p style={{ fontWeight: '600', textOverflow: 'ellipsis', overflow: 'hidden' }}>{selectedVendor.email || 'Not Listed'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Installed Capacity (Gujarat)</span>
                  <p style={{ fontWeight: '600' }}>{selectedVendor.capacity ? `${selectedVendor.capacity} kW` : 'Not Listed'} ({selectedVendor.install_count || 0} installs)</p>
                </div>
                <div>
                  <span style={{ color: 'var(--text-muted)' }}>Website URL</span>
                  <p style={{ fontWeight: '600' }}>
                    {selectedVendor.website ? (
                      <a href={selectedVendor.website.startsWith('http') ? selectedVendor.website : `https://${selectedVendor.website}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-blue)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                        {selectedVendor.website} <Globe size={11} />
                      </a>
                    ) : (
                      'Not Listed'
                    )}
                  </p>
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
                    <option value="Uninterested">Not Interested</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>Next Follow-Up Date</label>
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
                  href={`tel:${selectedVendor.mobile}`}
                  onClick={() => {
                    if (!callNote) setCallNote('Dialed phone number.');
                  }}
                  className="btn-secondary" 
                  style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none', padding: '8px 16px' }}
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

          </div>
        </div>
      )}

    </div>
    </>
  );
}

export default App;
