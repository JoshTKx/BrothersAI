import React, { useState, useEffect } from 'react'
import axios from 'axios'
import './Todo.css'

export default function TodoList() {
  const [todos, setTodos] = useState([])
  const [newTodo, setNewTodo] = useState("")
  const token = localStorage.getItem("accessToken")
  const config = { headers: { Authorization: `Bearer ${token}` } }

  useEffect(() => {
    axios.get("http://127.0.0.1:8000/api/todos/", config)
      .then(res => setTodos(res.data))
      .catch(() => setTodos([]))
  }, [])

  const addTodo = async (e) => {
    e.preventDefault()
    if (!newTodo.trim()) return
    const res = await axios.post("http://127.0.0.1:8000/api/todos/", { title: newTodo }, config)
    setTodos([...todos, res.data])
    setNewTodo("")
  }

  const toggleTodo = async (id, completed) => {
    await axios.patch(`http://127.0.0.1:8000/api/todos/${id}/`, { completed: !completed }, config)
    setTodos(todos.map(todo => todo.id === id ? { ...todo, completed: !completed } : todo))
  }

  const deleteTodo = async (id) => {
    await axios.delete(`http://127.0.0.1:8000/api/todos/${id}/`, config)
    setTodos(todos.filter(todo => todo.id !== id))
  }

  return (
    <div className="todo-list">
      <h3>My Todo List</h3>
      <form onSubmit={addTodo} style={{ marginBottom: "1em" }}>
        <input
          value={newTodo}
          onChange={e => setNewTodo(e.target.value)}
          placeholder="Add a new task"
        />
        <button type="submit">Add</button>
      </form>
      <ul>
        {todos.map(todo =>
          <li key={todo.id} style={{ textDecoration: todo.completed ? "line-through" : "" }}>
            <input
              type="checkbox"
              checked={todo.completed}
              onChange={() => toggleTodo(todo.id, todo.completed)}
            />
            {todo.title}
            <button onClick={() => deleteTodo(todo.id)} style={{ marginLeft: "1em" }}>Delete</button>
          </li>
        )}
      </ul>
    </div>
  )
}