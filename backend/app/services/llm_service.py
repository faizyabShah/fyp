import requests
import os

def generate_text(query, dir_path, name):
    """
    Sends a request to the Faiz endpoint with a JSON body containing the query.
    The response is saved to a text file.

    :param query: The query string to send in the JSON payload.
    :param dir_path: The directory path where the response file will be saved.
    :param name: The name of the file (without extension, if you like).
    """
    
    url = "https://10.3.16.62:443/ask_faiz"
    
    # Prepare the JSON payload
    payload = {
        "query": query
    }
    
    try:
        # Send the POST request
        # verify=False is used to ignore SSL certificate verification if needed
        # In production, you should handle certificates properly.
        response = requests.post(url, json=payload, verify=False)
        
        # Raise an exception if the request was not successful
        response.raise_for_status()

        response = response.json()

        result = response.get('response')
        
        # Create the directory if it doesn't exist
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
        
        # Construct the full file path
        file_path = os.path.join(dir_path, f"{name}.txt")
        
        # Write the response content to the file
        with open(file_path, 'w', encoding='utf-8') as file:
            file.write(result)
        
        print(f"Response successfully saved to {file_path}")
    
    except requests.exceptions.RequestException as e:
        print(f"An error occurred while sending the request: {e}")
