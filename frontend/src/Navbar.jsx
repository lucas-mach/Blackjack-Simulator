import React from 'react';
import { NavLink } from 'react-router-dom';
import './Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <NavLink to="/" className="brand-link">
          Blackjack
        </NavLink>
      </div>
      <ul className="navbar-items">
        <li>
          <NavLink to="/simulation" className={({ isActive }) => (isActive ? 'active' : '')}>
            Simulation Mode
          </NavLink>
        </li>
        <li>
          <NavLink to="/trainer" className={({ isActive }) => (isActive ? 'active' : '')}>
            Trainer Mode
          </NavLink>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
