import React from 'react';
import { useState, useEffect } from 'react';
import './Timetable.css';


const baseURL = 'http://127.0.0.1:8000/';

const timeToRow = (timeStr) => {
  // Handle both "1200" and "12:00" formats
  const normalized = timeStr.includes(":") ? timeStr : 
                    `${timeStr.slice(0, 2)}:${timeStr.slice(2)}`;
  const [hrs, mins] = normalized.split(':').map(Number);
  return (hrs - 8) * 2 + (mins >= 30 ? 1 : 0) + 2; // +2 for header rows
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
      setError(`Please remove modules not offered in Semester ${semester}: ${invalidModules.join(', ')}`);
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

      Object.entries(data).forEach(([modCode, lessons]) => {
        [initialSelections[modCode], ...alternatives[modCode]] = lessons;
      });

      setSelectedLessons(initialSelections);
      setAlternativeSlots(alternatives);
      setTimetable(data);
      
    } catch (e) {
      setError('Network error generating timetable');
    }
  };

  const weekdays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  const displayTimetableGrid = (timetable) => {
    const time = [];
    for (let i = 8; i < 21; i++) {
      time.push(`${i.toString().padStart(2, '0')}:00`);
    }
  
    return (
      <div className='timetable-grid'>
        {/* Header row: empty top-left, then time */}
        <div className='timetable-cell timetable-header'></div>
        {time.map(hr => (
          <div className='timetable-cell timetable-header' key={`header-${hr}`}>
            {hr}
          </div>
        ))}
        {/* Day rows */}
        {weekdays.map(day => (
          <React.Fragment key={`row-${day}`}>
          <div className='timetable-cell timetable-header'>{day.substring(0, 3)}</div>
          {time.map(hr => (
            <div 
              className='timetable-cell' 
              key={`${day}-${hr}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDrop(e, day, hr)}
            ></div>
          ))}
        </React.Fragment>
        ))}
  
        {/* Lesson blocks */}
        
        {Object.entries(selectedLessons).map(([modCode, lesson]) => {
          const startRow = timeToRow(lesson.startTime);
          const endRow = timeToRow(lesson.endTime);
          const dayIndex = weekdays.indexOf(lesson.day);

          return (
            <div
              key={modCode}
              className='timetable-lesson'
              draggable
              onDragStart={() => setDraggedLesson({ modCode, lesson })}
              style={{
                gridRow: `${startRow} / ${endRow}`,
                gridColumn: `${dayIndex + 2}`,
                backgroundColor: '#60a5fa',
                color: 'white',
                padding: '2px',
                borderRadius: '4px',
                cursor: 'grab',
              }}
            >
              <strong>{modCode}</strong>
              <div>{lesson.venue}</div>
              {/* Slot switcher dropdown */}
              <select
                value={JSON.stringify(lesson)}
                onChange={(e) => handleSlotChange(modCode, e.target.value)}
                style={{
                  width: '100%',
                  fontSize: '10px',
                  marginTop: '4px',
                }}
              >
                {alternativeSlots[modCode]?.map((alt, i) => (
                  <option 
                    key={i} 
                    value={JSON.stringify(alt)}
                  >
                    {alt.day} {alt.startTime}-{alt.endTime}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className='App'>
      <h1>Timetable</h1>
      <div className='controls'>
        <SemesterSelect semester={semester} onChange={(e) => setSemester(e.target.value)}/>

        <div>
          <input
            type='text'
            value={moduleInput}
            onChange={(e) => setModuleInput(e.target.value)}
            placeholder="Enter module code (e.g., CS1101S)"
          />
          <button onClick={addModule}>Add Module</button>
        </div>
      </div>

      <ErrorDisplay error={error}/>

      <ModuleList modules={modules} invalidModules={invalidModules} onRemove={removeModule} />

      <button onClick={generateTimetable}>Generate Timetable</button>

      {timetable && (
        <div className="timetable-container" style={{flexGrow: 1, display: 'flex', flexDirection: 'column', overflow: 'auto'}}>
          <h2>Timetable</h2>
          <div className="timetable-wrapper" style={{position: 'relative', marginTop: '2rem', flexGrow: 1 }}>
            {displayTimetableGrid(timetable)}
          </div>
        </div>
      )}
    </div>
  );
}

export default Timetable