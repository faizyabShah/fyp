import os

from groq import Groq

client = Groq(
    api_key="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",
)

chat_completion = client.chat.completions.create(
    messages=[
        {
            "role": "user",
            "content": "Explain the importance of fast language models",
        }
    ],
    model="llama3-8b-8192",
)

print(chat_completion.choices[0].message.content)