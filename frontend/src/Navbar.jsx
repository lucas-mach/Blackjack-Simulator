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
        <NavItem to="/dashboard" icon="dashboard" label="Dashboard" />
        <NavItem to="/simulation" icon="memory" label="Simulate" />
        <NavItem to="/trainer" icon="model_training" label="Training" />
      </ul>
    </nav>
  );
};

export default Navbar;
