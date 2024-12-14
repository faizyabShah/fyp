import '../styles/RequestDetail.css';
import { useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';


const RequestDetail = () => {
    const { id } = useParams();
    const isLoading = true;
    if (isLoading) return <div>Loading...</div>;
    return (
        <div>
        <Navbar/>
        <h1>Request Detail</h1>
        <pre>{JSON.stringify("hi", null, 2)}</pre>
        </div>
    );
}


export default RequestDetail;