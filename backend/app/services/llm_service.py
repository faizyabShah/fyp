from groq import Groq
import os

client = Groq(api_key=os.environ.get('GROQ_API_KEY', 'your_api_key_here'))

def generate_text(query, prompt):
    chat_completion = client.chat.completions.create(
        messages=[{"role": "user", "content": query}, {"role": "system", "content": prompt}],
        model="llama3-8b-8192",
    )
    return chat_completion.choices[0].message.content
