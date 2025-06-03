import React from 'react';
import { useState, useEffect } from 'react';
import './Timetable.css';


const baseURL = 'http://127.0.0.1:8000/';

const timeToRow = (timeStr) => {
  const [hrs, mins] = timeStr.split(':').map(Number);
  return (hrs - 8) * 2 + (mins === 30 ? 2 : 1);
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

function Timetable() {

  const [moduleInput, setModuleInput] = useState('');
  const [modules, setModules] = useState([]);
  const [nusModsCache, setNusModsCache] = useState([]);
  const [semester, setSemester] = useState('1');
  const [error, setError] = useState('');
  const [timetable, setTimetable] = useState(null);
  const [invalidModules, setInvalidModules] = useState([]);
  
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
      setTimetable(data);
    } catch (e) {
      setError('Network error generating timetable');
    }
  };

  const weekdays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

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
            {/* Row label (day) */}
            <div className='timetable-cell timetable-header'>{day}</div>
            {/* Empty cells for each hour */}
            {time.map(hr => (
              <div className='timetable-cell' key={`${day}-${hr}`}></div>
            ))}
          </React.Fragment>
        ))}
  
        {/* Lesson blocks */}
        {timetable &&
          Object.entries(timetable).flatMap(([modCode, lessons]) =>
            lessons.map((lesson, idx) => {
              const { day, startTime, endTime, venue } = lesson;
              const startRow = timeToRow(startTime);
              const endRow = timeToRow(endTime);
              const dayIndex = weekdays.indexOf(day);
  
              if (dayIndex === -1) return null;
  
              return (
                <div
                  key={`${modCode}-${idx}`}
                  className='timetable-cell timetable-lesson'
                  style={{
                    gridRow: `${startRow} / ${endRow}`,
                    gridColumn: `${dayIndex + 2} / ${dayIndex + 3}`,
                    backgroundColor: '#60a5fa',
                    color: 'white',
                    textAlign: 'center',
                    padding: '5px',
                    borderRadius: '5px',
                  }}
                >
                  <strong>{modCode}</strong>
                  <br />
                  {venue}
                </div>
              );
            })
          )}
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