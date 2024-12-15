import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import '../styles/Signup.css';
import Navbar from '../components/Navbar';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/Authcontext';

const Signup = () => {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [phone, setPhone] = useState([]);
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [language, setLanguage] = useState('English');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [address, setAddress] = useState('');

    // Custom hook to handle map events
    // const MapClickHandler = () => {
    //     useMapEvents({
    //         click: (event) => {
    //             const { lat, lng } = event.latlng;
    //             setCoordinates([...coordinates, [lat, lng]]);
    //         },
    //     });
    //     return null;
    // };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert('Passwords do not match');
            return;
        }
    
        const userData = {
            name: name,
            email: email,
            password: password,
            phone: phone,
            language: language,
            address: address,
        };
    
        try {
            const response = await fetch('http://localhost:5000/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(userData),
            });
    
            
            if (response.ok) {
                const data = await response.json();
                console.log('Signup successful:', data);
                login(data.token)
                navigate('/dashboard');
            } else {
                const errorData = await response.json();
                console.error('Signup failed:', errorData);
            }
        } catch (error) {
            console.error('Error:', error);
        }
    };
    

    const isfixed = false;

    return (
        <>
        <Navbar fixed={isfixed}/>
        <div className="signup" id="Signup">
            <div className="signup-container">
                <h1>Sign up</h1>
                <form onSubmit={handleSubmit} className="inputfields">
                    <input 
                        type="text" 
                        placeholder="Name" 
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input 
                        type="text" 
                        placeholder="Email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input 
                        type="password" 
                        placeholder="Password" 
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Confirm password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <input
                        type="text"
                        placeholder="Phone"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                    />
                    <p>Preferred language</p>
                    <select
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                    >
                        <option value="English">English</option>
                        <option value="Urdu">Urdu</option>
                    </select>
                    <input
                        type="text"
                        placeholder="Address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                    />

                    {/* <div className="map">
                        <p>Select your field</p>
                        <MapContainer center={[0, 0]} zoom={2} style={{ height: '500px', width: '100%' }}>
                            <TileLayer 
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" 
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                            <MapClickHandler />
                            {coordinates.map((position, idx) => (
                                <Marker key={idx} position={position}>
                                    <Popup>Coordinates: {position[0]}, {position[1]}</Popup>
                                </Marker>
                            ))}
                        </MapContainer>
                    </div> */}
                    {/* <p>Number of plots</p>
                    <input 
                        type="number" 
                        placeholder="Number of plots" 
                        value={numPlots}
                        onChange={(e) => setNumPlots(e.target.value)}
                    /> */}
                    <div className="noaccount">
                        <p>Already have an account? <a href="/#Login">Log in</a></p>
                    </div>
                    <button type="submit">Sign up</button>
                </form>
            </div>
        </div>
        </>
    );
}

export default Signup;
