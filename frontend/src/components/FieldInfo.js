import Legend from './Legend';
import field from '../media/field.jpg';
import masked from '../media/field_masked.jpg';
import './FieldInfo.css';

const legend = [
    {
        text: "Pre-germination",
        color: "blue"
    },
    {
        text: "Germination",
        color: "green"
    },
    {
        text: "Tillering",
        color: "yellow"
    },
    {
        text: "Stem Elongation",
        color: "orange"
    },
    {
        text: "Heading",
        color: "red"
    },
    {
        text: "Flowering",
        color: "purple"
    },
    {
        text: "Filling",
        color: "pink"
    },
    {
        text: "Maturity",
        color: "brown"
    }
  ]


function FieldInfo( {data, toggle, handleToggle} ) {
    return (
        <div className='fieldinfo'>
                <h1>Your Field</h1>
                <div className='fieldmask'>
                    <img src={toggle ? masked : field} alt="field" className="field" />
                        <Legend legend={legend} />
                </div>
                <div className="metadata"> 
                        <div className="toggle">
                            <label>Mask</label>
                            <label className="switch">
                                <input
                                    type="checkbox"
                                    checked={toggle}
                                    onChange={handleToggle}
                                />
                                <span className="slider round"></span>
                            </label>
                        </div>
                        <div className="plots">
                            <h2>Number of Plots</h2>
                            <p>{data.plots}</p>
                        </div>
                        
                    </div>
                    </div>
    )
}


export default FieldInfo;