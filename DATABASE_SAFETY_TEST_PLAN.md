# CRITICAL DATABASE SAFETY TEST PLAN

## **WARNING: This test plan is required because the previous code DELETED ALL DATA during updates**

### **Phase 1: Basic Course Update Tests**
1. **Create a test course** with 2 modules, 3 lessons each
2. **Update course title only** - verify modules/lessons remain intact
3. **Update course description only** - verify modules/lessons remain intact
4. **Update course metadata only** - verify modules/lessons remain intact

### **Phase 2: Module Modification Tests**
5. **Add a new module** - verify existing modules unchanged
6. **Update existing module title** - verify other modules unchanged
7. **Update existing module description** - verify other modules unchanged
8. **Reorder modules** - verify all lessons move with modules
9. **Delete a module** - verify only that module deleted, others intact

### **Phase 3: Lesson Modification Tests**
10. **Add new lesson to existing module** - verify other lessons unchanged
11. **Update existing lesson title** - verify other lessons unchanged
12. **Update existing lesson content** - verify other lessons unchanged
13. **Change lesson type** - verify other lessons unchanged
14. **Delete a lesson** - verify only that lesson deleted, others intact

### **Phase 4: Quiz-Specific Tests**
15. **Add quiz lesson to existing module** - verify other lessons unchanged
16. **Update quiz lesson content** - verify other lessons unchanged
17. **Generate quiz for existing module** - verify other lessons unchanged
18. **Update quiz questions** - verify other lessons unchanged
19. **Delete quiz lesson** - verify other lessons unchanged

### **Phase 5: Failure Scenario Tests**
20. **Simulate network failure during update** - verify no data loss
21. **Simulate Firestore timeout during update** - verify no data loss
22. **Simulate invalid quiz data during update** - verify no data loss
23. **Simulate large quiz data during update** - verify no data loss

### **Phase 6: Concurrent Update Tests**
24. **Two users update same course simultaneously** - verify no data corruption
25. **User updates course while another generates quiz** - verify no data loss
26. **Multiple quiz generations on same course** - verify no data loss

### **Phase 7: Data Integrity Verification**
27. **Check Firestore console** - verify no orphaned documents
28. **Check course structure** - verify all references intact
29. **Check quiz subcollections** - verify proper nesting
30. **Check lesson order** - verify sequential ordering maintained

## **CRITICAL FAILURE INDICATORS**
- ❌ Any module/lesson disappears during update
- ❌ Orphaned documents in Firestore
- ❌ Partial updates (some data saved, some lost)
- ❌ Course becomes empty after update
- ❌ Quiz data appears in wrong location
- ❌ Lesson order becomes incorrect

## **SUCCESS CRITERIA**
- ✅ All existing data preserved during updates
- ✅ Only intended changes occur
- ✅ Atomic transactions (all succeed or all fail)
- ✅ No orphaned documents
- ✅ Proper error handling with rollback
- ✅ Data integrity maintained

## **TEST EXECUTION LOG**
| Test # | Description | Status | Notes |
|--------|-------------|--------|-------|
| 1 | Create test course | ⏳ | |
| 2 | Update title only | ⏳ | |
| 3 | Update description only | ⏳ | |
| 4 | Update metadata only | ⏳ | |
| 5 | Add new module | ⏳ | |
| 6 | Update module title | ⏳ | |
| 7 | Update module description | ⏳ | |
| 8 | Reorder modules | ⏳ | |
| 9 | Delete module | ⏳ | |
| 10 | Add new lesson | ⏳ | |
| 11 | Update lesson title | ⏳ | |
| 12 | Update lesson content | ⏳ | |
| 13 | Change lesson type | ⏳ | |
| 14 | Delete lesson | ⏳ | |
| 15 | Add quiz lesson | ⏳ | |
| 16 | Update quiz content | ⏳ | |
| 17 | Generate quiz | ⏳ | |
| 18 | Update quiz questions | ⏳ | |
| 19 | Delete quiz lesson | ⏳ | |
| 20 | Network failure test | ⏳ | |
| 21 | Firestore timeout test | ⏳ | |
| 22 | Invalid quiz data test | ⏳ | |
| 23 | Large quiz data test | ⏳ | |
| 24 | Concurrent updates | ⏳ | |
| 25 | User conflict test | ⏳ | |
| 26 | Multiple quiz generation | ⏳ | |
| 27 | Firestore console check | ⏳ | |
| 28 | Course structure check | ⏳ | |
| 29 | Quiz subcollections check | ⏳ | |
| 30 | Lesson order check | ⏳ | |

## **EMERGENCY ROLLBACK PLAN**
If any test fails:
1. **STOP ALL TESTING IMMEDIATELY**
2. **Document the failure**
3. **Check Firestore for data loss**
4. **Restore from backup if available**
5. **Fix the code issue**
6. **Start over from Test 1**

---
**Created:** 2025-01-09  
**Reason:** Previous code DELETED ALL DATA during course updates  
**Status:** CRITICAL - Must pass all tests before production use
