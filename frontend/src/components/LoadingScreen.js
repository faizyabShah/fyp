

const LoadingScreen = () => {
    return (
        <div className="loading-screen" style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100vh",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            backgroundColor: "#f8f9fa",
            zIndex: 9999
        }}>
            <div className="spinner" style={{
                width: "50px",
                height: "50px",
                border: "5px solid rgba(0, 0, 0, 0.1)",
                borderLeft: "5px solid #4CAF50",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: "20px"
            }}></div>
            <h2>Loading...</h2>
            <style>
                {`
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                `}
            </style>
        </div>
    );
}

export default LoadingScreen;