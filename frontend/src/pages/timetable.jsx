import React from 'react';
import { useState, useEffect } from 'react';
import './Timetable.css';
import axiosInstance from '../utils/axiosConfig';

// Time string utilities
const normalizeTimeString = (timeStr) => {
  if (!timeStr) return "00:00"; // Handle undefined or empty string
  // Handle both "1200" and "12:00" formats
  return String(timeStr).includes(":") ? timeStr : 
         `${String(timeStr).slice(0, 2)}:${String(timeStr).slice(2)}`;
};

const getHoursFromTime = (timeStr) => {
  try {
    const normalized = normalizeTimeString(timeStr);
    const [hours] = normalized.split(':').map(Number);
    return isNaN(hours) ? 0 : hours;
  } catch (error) {
    console.error('Error parsing hours from time:', error);
    return 0;
  }
};

const parseTime = (timeStr) => {
  try {
    // Handle both "1200" and "12:00" formats
    const normalized = normalizeTimeString(timeStr);
    const [hours, minutes] = normalized.split(':').map(Number);
    return { 
      hours: isNaN(hours) ? 0 : hours, 
      minutes: isNaN(minutes) ? 0 : minutes 
    };
  } catch (error) {
    console.error('Error parsing time:', error);
    return { hours: 0, minutes: 0 };
  }
};

// Define weekdays array as a constant at module level
const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

// Calculate grid position and duration
const calculateGridPosition = (startTime, endTime, day, weekdays = WEEKDAYS) => {
  try {
    if (!startTime || !endTime || !day) {
      console.error('Missing required data:', { startTime, endTime, day });
      return { startColumn: 0, duration: 0, row: 0 };
    }

    const start = parseTime(startTime);
    const end = parseTime(endTime);
    const dayIndex = weekdays?.indexOf(day) ?? -1;
    
    if (dayIndex === -1) {
      console.error(`Invalid day "${day}" or weekdays array`);
      return { startColumn: 0, duration: 0, row: 0 };
    }
    
    // Grid starts at 8:00, columns are 1-based (first column is day labels)
    const startColumn = (start.hours - 8) + 2; // +2 because first column is day labels
    const duration = end.hours - start.hours;
    const row = dayIndex + 2; // +2 because first row is time headers
    
    return { startColumn, duration, row };
  } catch (error) {
    console.error('Error calculating grid position:', error);
    return { startColumn: 0, duration: 0, row: 0 };
  }
};

const timeToRow = (timeStr) => {
  try {
    const { hours } = parseTime(timeStr);
    // Account for the header row and convert to grid row
    return hours - 7; // Grid starts at 8am (row 2), so offset by 7
  } catch (error) {
    console.error('Error converting time to row:', error);
    return 0;
  }
};

// Convert a time string to a column position
const timeToColumn = (timeStr) => {
  try {
    const { hours } = parseTime(timeStr);
    return hours - 7; // Grid starts at 8am (column 2), so offset by 7
  } catch (error) {
    console.error('Error converting time to column:', error);
    return 0;
  }
};

// Calculate duration in grid cells
const calculateDuration = (startTime, endTime) => {
  const start = parseInt(startTime.split(':')[0]);
  const end = parseInt(endTime.split(':')[0]);
  return end - start;
};

const getSemLabel = (sem) => {
  return sem == '3' ? 'Special Term 1' :
         sem == '4' ? 'Special Term 2' :
         `Semester ${sem}`;
};

const SemesterSelect = ({semester, onChange}) => (
  <label>
    Semester:
    <select value={semester} onChange={onChange}>
      <option value={"1"}>Semester 1</option>
      <option value={"2"}>Semester 2</option>
      <option value={"3"}>Special Term 1</option>
      <option value={"4"}>Special Term 2</option>
    </select>
  </label>
);

const ModuleList = ({modules, invalidModules, onRemove}) => (
  <ul className="module-list">
    {modules.map((mod,i) => (
      <li key={i} className={`module-list-item ${invalidModules.includes(mod) ? 'invalid' : ''}`}>
        {mod} {invalidModules.includes(mod) && '(Not offered this semester)'}
        <button onClick={() => onRemove(mod)}>X</button>
      </li>
    ))}
  </ul>
);

const ErrorDisplay = ({error}) => (
  error ? <p className="error-message">{error}</p> : null
);

const LessonBlock = ({ 
  modCode, 
  lesson,
  isDragging,
  draggedLesson,
  alternativeSlots,
  onDragStart: handleDragStart,
  onDragEnd: handleDragEnd,
  onSlotChange: handleSlotChange,
  getColorForModule
}) => {
  const onDragStart = (e) => {
    // Prevent drag start if the click was on the select element
    if (e.target.tagName.toLowerCase() === 'select') {
      e.preventDefault();
      return;
    }

    // Set data transfer properties for better drag feedback
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', modCode);

    // Start the drag operation
    handleDragStart(modCode, lesson);
  };

  return (
    <div 
      className={`timetable-lesson ${isDragging && draggedLesson?.modCode === modCode ? 'dragging' : ''}`}
      draggable="true"
      onDragStart={onDragStart}
      onDragEnd={handleDragEnd}
      style={{
        gridColumn: `${timeToColumn(lesson.startTime)} / span ${calculateDuration(lesson.startTime, lesson.endTime)}`,
        gridRow: WEEKDAYS.indexOf(lesson.day) + 2,
        backgroundColor: getColorForModule(modCode)
      }}
    >
      <div className="lesson-content">
        <strong>{modCode}</strong>
        <div>{lesson.venue}</div>
        <div>{lesson.startTime}-{lesson.endTime}</div>
        
        {/* Dropdown to switch slots */}
        <select 
          onClick={(e) => e.stopPropagation()}
          onChange={(e) => handleSlotChange(modCode, e.target.value)}
          value={JSON.stringify(lesson)}
        >
          {alternativeSlots[modCode]?.map((alt, i) => (
            <option 
              key={i} 
              value={JSON.stringify(alt)}
            >
              {alt.day} {alt.startTime}-{alt.endTime} ({alt.venue})
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

const handleSlotChange = (modCode, selectedValue) => {
  const newLesson = JSON.parse(selectedValue);
  setSelectedLessons(prev => ({
    ...prev,
    [modCode]: newLesson
  }));
  
  // Check for clashes
  if (hasClashes(selectedLessons, modCode, newLesson)) {
    alert("This slot clashes with another lesson!");
    return;
  }
};

const hasClashes = (currentLessons, modifiedModCode, newLesson) => {
  return Object.entries(currentLessons).some(([modCode, lesson]) => {
    if (modCode === modifiedModCode) return false;
    
    return (
      lesson.day === newLesson.day &&
      (
        (newLesson.startTime <= lesson.startTime && newLesson.endTime > lesson.startTime) ||
        (newLesson.startTime < lesson.endTime && newLesson.endTime >= lesson.endTime) ||
        (newLesson.startTime >= lesson.startTime && newLesson.endTime <= lesson.endTime)
      )
    );
  });
};

function Timetable() {
  const [moduleInput, setModuleInput] = useState('');
  const [modules, setModules] = useState([]);
  const [nusModsCache, setNusModsCache] = useState([]);
  const [semester, setSemester] = useState('1');
  const [error, setError] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [invalidModules, setInvalidModules] = useState([]);
  const [selectedLessons, setSelectedLessons] = useState({}); 
  const [alternativeSlots, setAlternativeSlots] = useState({});
  const [draggedLesson, setDraggedLesson] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [possibleSlots, setPossibleSlots] = useState([]);
  const [shareEmail, setShareEmail] = useState("");
  const [shareStatus, setShareStatus] = useState("");

  const loadSavedTimetable = async () => {
    try {
      const response = await axiosInstance.get(`/timetableapi/timetable/my-timetable/?semester=${semester}`);
      if (!response?.data) return;
      
      setModules(response.data.modules || []);
      const data = response.data.timetable_data;
      console.log("Loaded saved timetable:", data);
      
      if (!data) return;
      
      const initialSelections = {};
      const alternatives = {};
      // Process the loaded timetable data same way as generation
      Object.entries(data).forEach(([modCode, lessons]) => {
        const lessonsByType = {};
        lessons.forEach(lesson => {
          const type = lesson.lessonType;
          if (!lessonsByType[type]) {
            lessonsByType[type] = [];
          }
          lessonsByType[type].push(lesson);
        });

        Object.entries(lessonsByType).forEach(([type, typeLessons]) => {
          const byClassNo = {};
          typeLessons.forEach(lesson => {
            if (!byClassNo[lesson.classNo]) {
              byClassNo[lesson.classNo] = [];
            }
            byClassNo[lesson.classNo].push(lesson);
          });

          // For each lesson type in a module, take the first class's lessons
          const classNumbers = Object.keys(byClassNo);
          if (classNumbers.length > 0) {
            const selectedClassNo = classNumbers[0];
            initialSelections[`${modCode}-${type}`] = byClassNo[selectedClassNo];
            alternatives[`${modCode}-${type}`] = classNumbers.slice(1).map(classNo => byClassNo[classNo]);
          }
        });
      });

      setSelectedLessons(initialSelections);
      setAlternativeSlots(alternatives);
      setTimetable(data);
    } catch (error) {
      // Only log real errors, ignore 404 (no timetable found)
      if (error.response?.status !== 404) {
        console.error("Failed to load saved timetable:", error);
      }
    }
  };

  // Fetch NUSMods module list and cache it
  useEffect(() => {
    const fetchModuleData = async() => {
      try {
        const res = await axiosInstance.get('/timetableapi/modules/');
        setNusModsCache(res.data);
      } catch(err) {
        setError('Failed to fetch module data');
      }
    };
    fetchModuleData();
    loadSavedTimetable();
  }, []);

  useEffect(() => {
    if (modules.length > 0) {
      updateInvalidModules(modules, semester);
    }
  }, [semester, modules]);

  // Check if module code is valid(exists in NUSMods list)
  const isModuleValid = (code) => {
    return nusModsCache && nusModsCache.some(mod => mod.moduleCode === code.toUpperCase());
  };

  const isModuleOfferedInSem = async (modCode, sem) => {
    try {
      const res = await axiosInstance.get(`/timetableapi/modules/${modCode}`);
      const data = res.data;
      return data.semesterData.some(s => String(s.semester) === sem);
    } catch {
      return false;
    }
  };
  
  // Update invalid module list based on semester currently selected
  const updateInvalidModules = async (mods, sem) => {
    const invalid = await Promise.all(
      mods.map(async (code) => {
        const offered = await isModuleOfferedInSem(code, sem);
        return !offered ? code : null;
      })
    );
    const filtered = invalid.filter(Boolean);
    setInvalidModules(filtered);
    if (filtered.length > 0){
      setError(`Please remove modules not offered in ${getSemLabel(semester)}: ${invalidModules.join(', ')}`);
    } else {
      setError('');
    }
  };

  const addModule = async () => {
    const modCode = moduleInput.trim().toUpperCase();
    setError('');
    if (!modCode){
      setError('Please enter a module code');
      return;
    }
    if (!isModuleValid(modCode)){
      setError(`Invalid module code: ${modCode}`);
      return;
    }
    if (modules.includes(modCode)){
      setError(`Module ${modCode} is already added`);
      return;
    }
    if (modules.includes(modCode)){
      setError(`Module ${modCode} is already added`);
      return;
    }
    if (!(await isModuleOfferedInSem(modCode, semester))) {
      setError(`Module ${modCode} is not offered in ${getSemLabel(semester)}`);
      return;
    }
    const updatedModules = [...modules, modCode];
    setModules(updatedModules);
    await updateInvalidModules(updatedModules,semester);
    setModuleInput('');
  };

  const removeModule = async (code) => {
    const updated = modules.filter(mod => mod !== code);
    setModules(updated);
    await updateInvalidModules(updated, semester);
  };


  const generateTimetable = async() => {
    setError('');
    setTimetable(null);
    if (modules.length === 0){
      setError('Please add at least 1 module');
      return;
    }
    if (invalidModules.length > 0){
      setError(`Please remove modules not offered in ${getSemLabel(semester)}: ${invalidModules.join(', ')}`);
      return;
    }

    try {
      // Generate timetable
      const resp = await axiosInstance.post('/timetableapi/generate-timetable/', {
        modules,
        semester
      });
      
      const data = resp.data;
      
      // Save the generated timetable
      try {
        await axiosInstance.post('/timetableapi/timetable/save/', {
          modules,
          semester,
          timetable_data: data
        });
        console.log("Timetable saved successfully");
      } catch (saveError) {
        console.error("Failed to save timetable:", saveError);
        // Continue even if save fails - user can still use the generated timetable
      }
      console.log("Generated Timetable:" , data);
      const initialSelections = {};
      const alternatives = {};

      // Group lessons by module and type
      Object.entries(data).forEach(([modCode, lessons]) => {
        // First, group by lesson type
        const lessonsByType = {};
        lessons.forEach(lesson => {
          const type = lesson.lessonType;
          if (!lessonsByType[type]) {
            lessonsByType[type] = [];
          }
          lessonsByType[type].push(lesson);
        });

        // For each lesson type, group by class number
        Object.entries(lessonsByType).forEach(([type, typeLessons]) => {
          // Group lessons by class number
          const byClassNo = {};
          typeLessons.forEach(lesson => {
            if (!byClassNo[lesson.classNo]) {
              byClassNo[lesson.classNo] = [];
            }
            byClassNo[lesson.classNo].push(lesson);
          });

          // Take the first class number's lessons as initial selection
          const firstClassNo = Object.keys(byClassNo)[0];
          const lessonKey = `${modCode}-${type}`;
          initialSelections[lessonKey] = byClassNo[firstClassNo];

          // Store other class numbers as alternatives
          alternatives[lessonKey] = Object.entries(byClassNo)
            .filter(([classNo]) => classNo !== firstClassNo)
            .map(([_, lessons]) => lessons);
        });
      });

      setSelectedLessons(initialSelections);
      setAlternativeSlots(alternatives);
      setTimetable(data);
      
    } catch (e) {
      setError('Network error generating timetable');
    }
  };

  const handleSlotChange = (lessonKey, selectedValue) => {
    let newLessons;
    try {
      newLessons = JSON.parse(selectedValue);
    } catch (error) {
      console.error('Failed to parse lesson data:', error);
      return;
    }
    
    // Validate the new lessons data
    if (!Array.isArray(newLessons) || !newLessons.every(lesson => 
      lesson && lesson.startTime && lesson.endTime && lesson.day && 
      WEEKDAYS.includes(lesson.day)
    )) {
      console.error('Invalid lesson data:', newLessons);
      return;
    }
    
    // Check if any of the new lessons clash with existing lessons
    const hasClash = Object.entries(selectedLessons).some(([key, lessons]) => {
      if (key === lessonKey) return false;
      
      // Convert lessons to array if it's not already
      const existingLessons = Array.isArray(lessons) ? lessons : [lessons];
      
      return existingLessons.some(existing => 
        existing && existing.day && // Validate existing lesson
        newLessons.some(newLesson =>
          existing.day === newLesson.day &&
          (
            (newLesson.startTime <= existing.startTime && newLesson.endTime > existing.startTime) ||
            (newLesson.startTime < existing.endTime && newLesson.endTime >= existing.endTime) ||
            (newLesson.startTime >= existing.startTime && newLesson.endTime <= existing.endTime)
          )
        )
      );
    });

    if (hasClash) {
      alert("This slot clashes with another lesson!");
      return;
    }

    setSelectedLessons(prev => ({
      ...prev,
      [lessonKey]: newLessons
    }));
  };

  // Create a map to store module colors
  const [moduleColors] = useState(() => {
    // Array of distinct colors
    const colors = [
      '#60a5fa',  // Blue
      '#34d399',  // Green
      '#f472b6',  // Pink
      '#a78bfa',  // Purple
      '#fbbf24',  // Yellow
      '#fb923c',  // Orange
      '#4ade80',  // Light Green
      '#f87171',  // Red
      '#38bdf8',  // Sky Blue
      '#818cf8'   // Indigo
    ];
    return new Map();
  });

  // Helper function to get or assign color for a module
  const getColorForModule = (modCode) => {
    if (!moduleColors.has(modCode)) {
      // Assign a new color from the array using the current map size as index
      const colorIndex = moduleColors.size % 10;
      const colors = [
        '#60a5fa',  // Blue
        '#34d399',  // Green
        '#f472b6',  // Pink
        '#a78bfa',  // Purple
        '#fbbf24',  // Yellow
        '#fb923c',  // Orange
        '#4ade80',  // Light Green
        '#f87171',  // Red
        '#38bdf8',  // Sky Blue
        '#818cf8'   // Indigo
      ];
      moduleColors.set(modCode, colors[colorIndex]);
    }
    return moduleColors.get(modCode);
  };

  const displayTimetableGrid = (timetable) => {
    const timeSlots = [];
    // Generate time slots from 8:00 to 20:00
    for (let i = 8; i <= 20; i++) {
      timeSlots.push(`${i.toString().padStart(2, '0')}:00`);
    }
    
    return (
      <div className='timetable-wrapper'>
        <div className='timetable-grid'>
          {/* Empty corner cell */}
          <div className='timetable-cell timetable-header corner-header'></div>
          
          {/* Time headers */}
          {timeSlots.map((time, index) => (
            <div 
              key={`time-${time}`} 
              className='timetable-cell timetable-header'
              style={{ gridColumn: index + 2 }}
            >
              {time}
            </div>
          ))}
          
          {/* Days and time slots */}
          {WEEKDAYS.map((day, dayIndex) => (
            <React.Fragment key={day}>
              {/* Day header */}
              <div 
                className='timetable-cell day-header'
                style={{ gridRow: dayIndex + 2 }}
              >
                {day}
              </div>
              
              {/* Time slots */}
              {timeSlots.map((time, timeIndex) => (
                <div 
                  key={`${day}-${time}`}
                  className={`timetable-cell ${
                    isDragging && possibleSlots.includes(`${day}-${time}`) ? 'possible-slot' : ''
                  }`}
                  style={{
                    gridColumn: timeIndex + 2,
                    gridRow: dayIndex + 2,
                    position: 'relative'
                  }}
                  data-day={day}
                  data-time={time}
                  onDragOver={(e) => handleDragOver(e, day, time)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day, time)}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Lesson blocks */}
          {Object.entries(selectedLessons).map(([lessonKey, lessons]) => {
            const [modCode, type] = lessonKey.split('-');
            const lessonArray = Array.isArray(lessons) ? lessons : [lessons];

            return lessonArray.filter(lesson => 
              lesson && lesson.startTime && lesson.endTime && lesson.day
            ).map((lesson, index) => {
              const { startColumn, duration, row } = calculateGridPosition(
                lesson.startTime,
                lesson.endTime,
                lesson.day,
                WEEKDAYS
              );

              const onLessonDragStart = (e) => {
                // Prevent drag start if the click was on the select element
                if (e.target.tagName.toLowerCase() === 'select') {
                  e.preventDefault();
                  return;
                }

                // Set data transfer properties for better drag feedback
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', modCode);

                // Start the drag operation
                handleDragStart(modCode, lesson);
              };

              return (
                <div
                  key={`${lessonKey}-${index}`}
                  className='timetable-lesson'
                  style={{
                    '--lesson-column': `${startColumn} / span ${duration}`,
                    '--lesson-row': row,
                    '--lesson-color': getColorForModule(modCode)
                  }}
                  draggable="true"
                  onDragStart={onLessonDragStart}
                  onDragEnd={handleDragEnd}
                >
                  <div className="lesson-content">
                    <strong>{modCode}</strong>
                    <div>{type}</div>
                    <div>
                      <span>Group {lesson.classNo}</span>
                      <span> • {lesson.venue}</span>
                    </div>
                    <div>{lesson.startTime}-{lesson.endTime}</div>
                    
                    {index === 0 && alternativeSlots[lessonKey]?.length > 0 && (
                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={JSON.stringify(lessonArray)}
                        onChange={(e) => handleSlotChange(lessonKey, e.target.value)}
                        title="Change group"
                      >
                        <option value={JSON.stringify(lessonArray)}>
                          Group {lesson.classNo}
                        </option>
                        {alternativeSlots[lessonKey]?.map((altLessons, i) => 
                          altLessons?.length > 0 ? (
                            <option key={i} value={JSON.stringify(altLessons)}>
                              Group {altLessons[0].classNo}
                            </option>
                          ) : null
                        )}
                      </select>
                    )}
                  </div>
                </div>
              );
            });
          })}
        </div>
      </div>
    );
  };

  // Drag and drop handlers
  const handleDragStart = (modCode, lesson) => {
    if (typeof modCode !== 'string' || !lesson) return;
    
    setDraggedLesson({ modCode, lesson });
    setIsDragging(true);

    // Calculate and show all possible slots immediately when dragging starts
    const possibleTimes = calculatePossibleSlots(modCode, lesson);
    setPossibleSlots(possibleTimes);
    
    // Add dragging class to the lesson being dragged
    document.querySelectorAll(`.timetable-lesson`).forEach(el => {
      if (el.querySelector(`strong`)?.textContent === modCode) {
        el.classList.add('dragging');
      }
    });
  };

  const handleDragEnd = () => {
    setIsDragging(false);
    setDraggedLesson(null);
    setPossibleSlots([]);
    
    // Remove visual feedback classes
    document.querySelectorAll('.timetable-cell').forEach(el => {
      el.classList.remove('droppable', 'invalid-drop');
    });
    document.querySelectorAll('.timetable-lesson').forEach(el => {
      el.classList.remove('dragging');
    });
  };

  const isPossibleSlot = (slot) => {
    return possibleSlots && possibleSlots.includes(slot);
  };

  const handleDragOver = (e, day, time) => {
    if (!e || !e.currentTarget || !e.currentTarget.classList) return;
    e.preventDefault();
    if (!draggedLesson) return;
    const slot = `${day}-${time}`;
    const isValid = isPossibleSlot(slot);
    e.currentTarget.classList.remove('possible-slot');
    e.currentTarget.classList.toggle('droppable', isValid);
    e.currentTarget.classList.toggle('invalid-drop', !isValid);
  };

  const handleDragLeave = (e) => {
    if (!e || !e.currentTarget || !e.currentTarget.classList) return;
    e.preventDefault();
    const day = e.currentTarget.getAttribute('data-day');
    const time = e.currentTarget.getAttribute('data-time');
    if (!day || !time) return;
    const slot = `${day}-${time}`;
    e.currentTarget.classList.remove('droppable', 'invalid-drop');
    if (possibleSlots.includes(slot)) {
      e.currentTarget.classList.add('possible-slot');
    }
  };

  const handleDrop = (e, day, time) => {
    if (!e || !e.currentTarget || !e.currentTarget.classList) return;
    e.preventDefault();
    e.currentTarget.classList.remove('droppable', 'invalid-drop');
    if (!draggedLesson) return;
    const slot = `${day}-${time}`;
    if (!isPossibleSlot(slot)) {
      e.currentTarget.classList.add('invalid-drop');
      setTimeout(() => {
        if (e.currentTarget && e.currentTarget.classList) {
          e.currentTarget.classList.remove('invalid-drop');
        }
      }, 500);
      return;
    }
    
    const { modCode, lesson } = draggedLesson;
    const [baseModCode, lessonType] = modCode.split('-');
    const currentClassNo = lesson.classNo;

    // Find the specific alternative slot that matches the drop position
    let matchingSlot = null;
    Object.entries(alternativeSlots).forEach(([key, alternatives]) => {
      const [altModCode, altType] = key.split('-');
      if (altModCode === baseModCode && altType === lessonType) {
        alternatives.forEach(altGroup => {
          if (altGroup[0]?.classNo === currentClassNo) {
            const match = altGroup.find(alt => 
              alt.day === day && alt.startTime === time
            );
            if (match) {
              matchingSlot = match;
            }
          }
        });
      }
    });

    if (matchingSlot) {
      // Update the lesson to the new slot
      const newLesson = {
        ...lesson,
        day: matchingSlot.day,
        startTime: matchingSlot.startTime,
        endTime: matchingSlot.endTime,
        venue: matchingSlot.venue
      };

      setSelectedLessons(prev => ({
        ...prev,
        [modCode]: newLesson
      }));
    }

    // Reset dragged lesson and possible slots
    setDraggedLesson(null);
    setPossibleSlots([]);
  };

  const calculatePossibleSlots = (modCode, lesson) => {
    const possible = [];
    const { startTime, endTime, day } = lesson;
    const startHour = getHoursFromTime(startTime);
    const endHour = getHoursFromTime(endTime);
    const dayIndex = new Date(`1970-01-01T00:00:00Z`).getUTCDay() - 1; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday

    // Check each hour in the lesson's duration
    for (let hour = startHour; hour < endHour; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
      possible.push(`${day}-${timeSlot}`);
    }
    
    return possible;
  };

  const handleShare = async () => {
    setShareStatus("");
    if (!shareEmail) {
      setShareStatus("Please enter an email to share with.");
      return;
    }
    if (!timetable || !modules || modules.length === 0) {
      setShareStatus("No timetable to share.");
      return;
    }

    try {
      // Create a complete timetable object with all necessary data
      const completeData = {
        modules: modules,
        semester: semester,
        timetable_data: timetable,
        selected_lessons: selectedLessons,
        alternative_slots: alternativeSlots
      };

      const res = await axiosInstance.post('/timetableapi/timetable/share/', {
        email: shareEmail,
        timetable: completeData
      });
      setShareStatus("Timetable shared successfully!");
      setShareEmail(""); // Clear the email input after successful share
    } catch (e) {
      setShareStatus(e.response?.data?.error || "Failed to share timetable.");
    }
  };

  return (
    <div className="timetable-container">
      <h1>NUS Modular System Timetable Planner</h1>
      
      <div className="module-input">
        <input 
          type="text" 
          value={moduleInput} 
          onChange={(e) => setModuleInput(e.target.value)}
          placeholder="Enter module code"
        />
        <button onClick={addModule}>Add Module</button>
      </div>
      
      <SemesterSelect 
        semester={semester} 
        onChange={(e) => setSemester(e.target.value)}
      />
      
      <ErrorDisplay error={error} />
      
      <ModuleList 
        modules={modules} 
        invalidModules={invalidModules}
        onRemove={removeModule}
      />
      
      <button onClick={generateTimetable}>Generate Timetable</button>
      {timetable && displayTimetableGrid(timetable)}
      {/* Share section */}
      <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input
            type="email"
            placeholder="Recipient's email"
            value={shareEmail}
            onChange={e => setShareEmail(e.target.value)}
            style={{ padding: 6, borderRadius: 4, border: '1px solid #ccc' }}
          />
          <button onClick={handleShare} style={{ padding: '6px 16px' }}>Share</button>
        </div>
        {shareStatus && <div style={{ marginTop: 8, color: shareStatus.includes('!') ? 'green' : 'red' }}>{shareStatus}</div>}
      </div>
    </div>
  );
}

export default Timetable;