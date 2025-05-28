import React from 'react'
import { useState, useEffect } from 'react'


function App() {

  const [moduleInput, setModuleInput] = useState('');
  const [modules, setModules] = useState([]);
  const [nusModules, setNusModules] = useState([]);
  const [semester, setSemester] = useState(1);
  const [error, setError] = useState('');
    
  useEffect(() => {
    const fetchModules = async() => {
      try {
        const response = await fetch('https://api.nusmods.com/v2/2024-2025/moduleList.json')
        const data = await response.json();
        setNusModules(data.map(mod => mod.moduleCode.toUpperCase()));
      } catch (err) {
        console.error('Error fetching module list:', err);
      }
    };
    fetchModules();

  }, []);


  const addModule = async () => {
    const modCode = moduleInput.trim().toUpperCase();
    setError('');

    if (!modCode) {
      setError('Please enter a module code');
      return;
    }

    if (!nusModules.includes(modCode)) {
      setError('Invalid module code: ${modCode}');
      return;
    }

    if (modules.includes(modCode)) {
      setError('Module already added');
      return;
    }

    try {
      c
    }
  }
}