import './Legend.css';




function Legend ({legend}) {
  return (
    <div className="legend">
     {legend.map((item, index) => (
       <div className="legend-item" key={index}>
         <div className="legend-color" style={{ backgroundColor: item.color }} />
         <div className="legend-text">{item.text}</div>
       </div>
     ))}
    </div>
  );
}

export default Legend;