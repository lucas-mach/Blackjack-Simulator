import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const NavItem = ({ to, end, icon, label }) => (
  <li>
    <NavLink to={to} end={end} className={({ isActive }) => (isActive ? 'active' : '')}>
      <span className="nav-icon material-symbols-outlined" aria-hidden>
        {icon}
      </span>
      <span className="nav-label">{label}</span>
    </NavLink>
  </li>
);

const Navbar = () => {
  return (
    <nav className="navbar" aria-label="Main navigation">
      <ul className="navbar-items">
        <li>
          <NavLink class="nav-label" to="/simulation" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span class="material-symbols-outlined nav-icon">
            memory
          </span>
            Simulation Mode
          </NavLink>
        </li>
        <li>
          <NavLink class="nav-label" to="/trainer" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span class="material-symbols-outlined nav-icon">
            model_training
          </span>
            Trainer Mode
          </NavLink>
        </li>
        <li>
          <NavLink class="nav-label" to="/graph" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span class="material-symbols-outlined nav-icon">
            finance_mode
          </span>
            Graph (Testing)
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
