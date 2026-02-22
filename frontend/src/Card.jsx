import React from 'react';
import './Card.css';

const suitName = (suit) => {
  // Normalize suit names for filenames (basic)
  return String(suit).replace(/[^A-Za-z]/g, '');
};

const Card = ({ rank, suit }) => {
  const filename = `/cards/${rank}_of_${suitName(suit)}.svg`;
  const fallback = '/cards/sample_card.svg';

  return (
    <img
      src={filename}
      alt={`${rank} of ${suit}`}
      onError={(e) => {
        if (e.target.src !== window.location.origin + fallback) e.target.src = fallback;
      }}
      className="card-img"
      style={{ width: '72px', height: '100px', marginRight: '6px' }}
    />
  );
};

export default Card;
