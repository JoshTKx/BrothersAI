import React from 'react';
import { useState, useEffect } from 'react';
import './Timetable.css';


const baseURL = 'http://127.0.0.1:8000/';

// Time string utilities
const normalizeTimeString = (timeStr) => {
  // Handle both "1200" and "12:00" formats
  return timeStr.includes(":") ? timeStr : 
         `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
};

const getHoursFromTime = (timeStr) => {
  const normalized = normalizeTimeString(timeStr);
  const [hours] = normalized.split(':').map(Number);
  return hours;
};

const parseTime = (timeStr) => {
  // Handle both "1200" and "12:00" formats
  const normalized = timeStr.includes(":") ? timeStr : 
                    `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
  const [hours, minutes] = normalized.split(':').map(Number);
  return { hours, minutes };
};

// Calculate grid position and duration
const calculateGridPosition = (startTime, endTime, day, weekdays) => {
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  const dayIndex = weekdays.indexOf(day);
  
  // Grid starts at 8:00, columns are 1-based (first column is day labels)
  const startColumn = (start.hours - 8) + 2; // +2 because first column is day labels
  const duration = end.hours - start.hours;
  const row = dayIndex + 2; // +2 because first row is time headers
  
  return { startColumn, duration, row };
};

const timeToRow = (timeStr) => {
  // Handle both "1200" and "12:00" formats
  const normalized = timeStr.includes(":") ? timeStr : 
                    `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
  const [hrs, mins] = normalized.split(':').map(Number);
  // Account for the header row and convert to grid row
  return hrs - 7; // Grid starts at 8am (row 2), so offset by 7
};

// Convert a time string to a column position
const timeToColumn = (timeStr) => {
  const normalized = timeStr.includes(":") ? timeStr : 
                    `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
  const [hrs] = normalized.split(':').map(Number);
  return hrs - 7; // Grid starts at 8am (column 2), so offset by 7
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
  <ul>
    {modules.map((mod,i) => (
      <li key={i} style={{color: invalidModules.includes(mod) ? 'red' : 'black'}}>
        {mod} {invalidModules.includes(mod) && '(Not offered this semester)'}
        <button onClick={() => onRemove(mod)} style={{marginLeft: '10px'}}>X</button>
      </li>
    ))}
  </ul>
);

const ErrorDisplay = ({error}) => (
  error ? <p style={{color: 'red'}}>{error}</p> : null
);

const LessonBlock = ({ modCode, lesson, onDragStart }) => {
  return (
    <div 
      className="lesson-block" 
      draggable
      onDragStart={onDragStart}
    >
      <div>{modCode}</div>
      <div>{lesson.venue}</div>
      <div>{lesson.startTime}-{lesson.endTime}</div>
      
      {/* Dropdown to switch slots */}
      <select 
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

const handleDrop = (e, targetDay, targetTime) => {
  e.preventDefault();
  
  if (!draggedLesson) return;
  
  // Check if drop target is valid
  const validSlots = alternativeSlots[draggedLesson.modCode] || [];
  const isValidDrop = validSlots.some(slot => 
    slot.day === targetDay && 
    slot.startTime === targetTime
  );
  
  if (isValidDrop) {
    const newLesson = validSlots.find(slot => 
      slot.day === targetDay && 
      slot.startTime === targetTime
    );
    
    setSelectedLessons(prev => ({
      ...prev,
      [draggedLesson.modCode]: newLesson
    }));
  }
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

  // Fetch NUSMods module list and cache it
  useEffect(() => {
    const fetchModuleData = async() => {
      try {
        const res = await fetch(`${baseURL}timetableapi/modules/`)
        if(!res.ok) throw new Error('Failed to fetch module list');
        const data = await res.json();
        setNusModsCache(data);
      } catch(err) {
        setError('Failed to fetch module data');
      }
    };
    fetchModuleData();
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
      const res = await fetch(`${baseURL}timetableapi/modules/${modCode}`);
      if(!res.ok) return false;
      const data = await res.json();
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
      const resp = await fetch(`${baseURL}timetableapi/generate-timetable/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({modules, semester}),
      });
      
      if (!resp.ok) {
        const errData = await resp.json();
        setError(errData.error || 'Failed to generate timetable');
        return;
      }

      const data = await resp.json();
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
    const newLessons = JSON.parse(selectedValue);
    
    // Check if any of the new lessons clash with existing lessons
    const hasClash = Object.entries(selectedLessons).some(([key, lessons]) => {
      if (key === lessonKey) return false;
      
      // Convert lessons to array if it's not already
      const existingLessons = Array.isArray(lessons) ? lessons : [lessons];
      
      return existingLessons.some(existing => 
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

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

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
              style={{
                gridColumn: index + 2
              }}
            >
              {time}
            </div>
          ))}
          
          {/* Days and time slots */}
          {weekdays.map((day, dayIndex) => (
            <React.Fragment key={day}>
              {/* Day header */}
              <div 
                className='timetable-cell day-header'
                style={{
                  gridRow: dayIndex + 2
                }}
              >
                {day}
              </div>
              
              {/* Time slots */}
              {timeSlots.map((time, timeIndex) => (
                <div 
                  key={`${day}-${time}`}
                  className='timetable-cell'
                  style={{
                    gridColumn: timeIndex + 2,
                    gridRow: dayIndex + 2
                  }}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, day, time)}
                />
              ))}
            </React.Fragment>
          ))}

          {/* Lesson blocks */}
          {Object.entries(selectedLessons).map(([lessonKey, lessons]) => {
            const [modCode, type] = lessonKey.split('-');
            const lessonArray = Array.isArray(lessons) ? lessons : [lessons];

            return lessonArray.map((lesson, index) => {
              const { startColumn, duration, row } = calculateGridPosition(
                lesson.startTime,
                lesson.endTime,
                lesson.day,
                weekdays
              );

              return (
                <div
                  key={`${lessonKey}-${index}`}
                  className='timetable-lesson'
                  style={{
                    gridColumn: `${startColumn} / span ${duration}`,
                    gridRow: row,
                    backgroundColor: getColorForModule(modCode)
                  }}
                  draggable
                  onDragStart={(e) => {
                    e.stopPropagation();
                    setDraggedLesson({ modCode, type, lessons: lessonArray });
                  }}
                >
                  <div className="lesson-content">
                    <strong>{modCode}</strong>
                    <div>{type}</div>
                    <div>Group {lesson.classNo}</div>
                    <div>{lesson.venue}</div>
                    <div>{lesson.startTime}-{lesson.endTime}</div>
                    
                    {index === 0 && alternativeSlots[lessonKey]?.length > 0 && (
                      <select
                        onClick={(e) => e.stopPropagation()}
                        value={JSON.stringify(lessonArray)}
                        onChange={(e) => handleSlotChange(lessonKey, e.target.value)}
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

  return (
    <div className='App'>
      <div className='controls-container'>
        <h1 style={{ margin: '0 0 1rem 0' }}>Timetable</h1>
        
        <div className='controls'>
          <SemesterSelect semester={semester} onChange={(e) => setSemester(e.target.value)}/>

          <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
            <input
              type='text'
              value={moduleInput}
              onChange={(e) => setModuleInput(e.target.value)}
              placeholder="Enter module code (e.g., CS1101S)"
              style={{ flex: 1 }}
            />
            <button onClick={addModule}>Add Module</button>
          </div>
        </div>

        <ErrorDisplay error={error}/>

        {modules.length > 0 && (
          <>
            <ModuleList 
              modules={modules} 
              invalidModules={invalidModules} 
              onRemove={removeModule} 
            />
            <button 
              onClick={generateTimetable}
              style={{ marginTop: '0.5rem' }}
            >
              Generate Timetable
            </button>
          </>
        )}
      </div>

      {timetable && (
        <div className="timetable-container">
          <div className="timetable-wrapper">
            {displayTimetableGrid(timetable)}
          </div>
        </div>
      )}
    </div>
  );
}

export default Timetable