# ARCHITECTURE STANDARDS & PATTERNS

## **CORE DESIGN PRINCIPLES**

### **1. Single Source of Truth**
- **Firebase is the ONLY source of truth** for all server data
- **No local caching** of server data in components
- **No fallback data** - always fetch fresh from Firebase
- **One authoritative source** per data entity

### **2. Server State vs Client State Separation**
- **Server State**: Data from Firebase/APIs - NEVER store locally
- **Client State**: UI state, form state, user interactions - CAN store locally
- **Clear boundaries** between server and client state
- **No mixing** of server and client state in same useState

### **3. Data Fetching Patterns**
- **Direct API calls** for all server data
- **Re-fetch after mutations** - no optimistic updates
- **Fresh data on every action** - no stale data
- **Proper error handling** for all API calls

### **4. React State Management Standards**
- **useState + useEffect** for local component state (industry standard)
- **Context API** for global client state only
- **No state management libraries** for simple applications
- **Keep state local** when possible

---

## **ARCHITECTURE PATTERNS**

### **SERVER STATE PATTERN**
```typescript
// ✅ CORRECT: Server state - fetch directly, no local storage
const CourseList = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Fetch fresh data from Firebase API
  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/courses');
      const freshCourses = await response.json();
      setCourses(freshCourses);
    } catch (error) {
      console.error('Failed to fetch courses:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCourses();
  }, []);
  
  // Re-fetch after any mutation
  const handleDelete = async (id: string) => {
    await deleteCourse(id);
    fetchCourses(); // Always re-fetch fresh data
  };
  
  return (
    <div>
      {loading ? <LoadingSpinner /> : <CourseGrid courses={courses} />}
    </div>
  );
};
```

### **CLIENT STATE PATTERN**
```typescript
// ✅ CORRECT: Client state - can store locally
const CourseForm = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'programming'
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // Form state is client state - OK to store locally
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };
  
  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await createCourse(formData);
      // Re-fetch server data after mutation
      window.location.reload(); // Or trigger parent re-fetch
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

### **MIXED STATE PATTERN (ANTI-PATTERN)**
```typescript
// ❌ WRONG: Mixing server and client state
const CourseForm = () => {
  // ❌ Server state stored locally
  const [courseData, setCourseData] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  
  // ✅ Client state - OK to store locally
  const [isEditing, setIsEditing] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  
  // ❌ This creates two sources of truth
  useEffect(() => {
    fetchCourseData().then(data => {
      setCourseData(data); // Storing server data locally
    });
  }, []);
};
```

---

## **DATA FLOW PATTERNS**

### **1. Server Data Flow**
```
Firebase → API Endpoint → Component State → UI Rendering
```

**Rules:**
- Always fetch fresh data
- No local caching
- Re-fetch after mutations
- Handle loading states

### **2. Client Data Flow**
```
User Interaction → Local State → UI Update
```

**Rules:**
- Store in local state
- No server round-trip needed
- Can persist during session
- Reset on component unmount

### **3. Form Data Flow**
```
User Input → Local Form State → Validation → Submit → API Call → Re-fetch Server Data
```

**Rules:**
- Form state is client state
- Validate before submit
- Clear form after successful submit
- Re-fetch server data after mutation

---

## **COMPONENT ARCHITECTURE PATTERNS**

### **1. Data Display Components**
```typescript
// ✅ CORRECT: Display components fetch their own data
const CourseViewer = ({ courseId }: { courseId: string }) => {
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetchCourse(courseId).then(setCourse).finally(() => setLoading(false));
  }, [courseId]);
  
  if (loading) return <LoadingSpinner />;
  if (!course) return <NotFound />;
  
  return <CourseContent course={course} />;
};
```

### **2. Form Components**
```typescript
// ✅ CORRECT: Form components manage client state
const CourseForm = ({ onSubmit }: { onSubmit: (data: CourseData) => void }) => {
  const [formData, setFormData] = useState<CourseData>({
    title: '',
    description: '',
    category: 'programming'
  });
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData); // Pass to parent, don't store server data
  };
  
  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
};
```

### **3. Admin Components**
```typescript
// ✅ CORRECT: Admin components fetch fresh data
const AdminDashboard = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  
  const fetchCourses = async () => {
    setLoading(true);
    const response = await fetch('/api/courses');
    const freshCourses = await response.json();
    setCourses(freshCourses);
    setLoading(false);
  };
  
  useEffect(() => {
    fetchCourses();
  }, []);
  
  const handleDelete = async (id: string) => {
    await deleteCourse(id);
    fetchCourses(); // Always re-fetch
  };
  
  return (
    <div>
      {loading ? <LoadingSpinner /> : <CourseList courses={courses} onDelete={handleDelete} />}
    </div>
  );
};
```

---

## **API PATTERNS**

### **1. Data Fetching APIs**
```typescript
// ✅ CORRECT: Simple fetch pattern
const fetchCourses = async (): Promise<Course[]> => {
  const response = await fetch('/api/courses');
  if (!response.ok) throw new Error('Failed to fetch courses');
  return response.json();
};
```

### **2. Mutation APIs**
```typescript
// ✅ CORRECT: Mutation with re-fetch
const deleteCourse = async (id: string): Promise<void> => {
  const response = await fetch(`/api/courses/${id}`, { method: 'DELETE' });
  if (!response.ok) throw new Error('Failed to delete course');
  // Don't update local state - let component re-fetch
};
```

### **3. Error Handling**
```typescript
// ✅ CORRECT: Proper error handling
const fetchCourses = async (): Promise<Course[]> => {
  try {
    const response = await fetch('/api/courses');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    return response.json();
  } catch (error) {
    console.error('Failed to fetch courses:', error);
    throw error; // Re-throw for component to handle
  }
};
```

---

## **ENFORCEMENT RULES**

### **1. Server State Rules**
- ❌ Never store server data in useState
- ❌ Never cache server data locally
- ❌ Never use server data as fallback
- ✅ Always fetch fresh data
- ✅ Always re-fetch after mutations

### **2. Client State Rules**
- ✅ Store UI state in useState
- ✅ Store form state in useState
- ✅ Store user preferences in useState
- ✅ Store component state in useState

### **3. Data Flow Rules**
- ✅ One source of truth per data entity
- ✅ Firebase is source of truth for server data
- ✅ Local state is source of truth for client data
- ✅ Clear separation between server and client state

---

## **IMPLEMENTATION CHECKLIST**

### **Before Making Changes:**
- [ ] Identify if data is server state or client state
- [ ] Server state: Remove local storage, add fresh fetching
- [ ] Client state: Keep local storage, ensure proper boundaries
- [ ] Verify single source of truth principle
- [ ] Test data consistency after changes

### **After Making Changes:**
- [ ] Verify no local caching of server data
- [ ] Verify fresh data on every action
- [ ] Verify proper error handling
- [ ] Verify single source of truth maintained
- [ ] Test complete data flow

---

**This architecture ensures:**
- ✅ Industry standard React patterns
- ✅ Proper server vs client state separation
- ✅ Single source of truth maintained
- ✅ No data inconsistency issues
- ✅ Clean, maintainable code
