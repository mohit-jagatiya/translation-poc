const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

app.post('/api/translate', async (req, res) => {
    const { text, langInfo } = req.body;
    
    if (!text || !langInfo || !langInfo.engine) {
        return res.status(400).json({ error: 'Missing text or language info' });
    }

    try {
        if (langInfo.engine === 'deepl') {
            const deeplUrl = 'https://api-free.deepl.com/v2/translate';
            
            // Format for DeepL
            const params = new URLSearchParams();
            params.append('text', text);
            params.append('target_lang', langInfo.code === 'CM' ? 'ZH' : langInfo.code);
            
            const response = await fetch(deeplUrl, {
                method: 'POST',
                headers: { 
                    'Authorization': `DeepL-Auth-Key ${process.env.DEEPL_API_KEY}`,
                    'Content-Type': 'application/x-www-form-urlencoded' 
                },
                body: params
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                return res.status(response.status).json({ error: data.message || 'DeepL API Error' });
            }

            if (data.translations && data.translations.length > 0) {
                return res.json({ translatedText: data.translations[0].text });
            } else {
                return res.status(500).json({ error: 'No translation returned from DeepL' });
            }
            
        } else if (langInfo.engine === 'gpt') {
            const openaiUrl = 'https://api.openai.com/v1/chat/completions';
            
            const response = await fetch(openaiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
                },
                body: JSON.stringify({
                    model: "gpt-4o",
                    messages: [
                        { role: "system", content: `You are a professional medical translator. Translate the following healthcare instruction to ${langInfo.name}. Return ONLY the translated text without any quotes or explanations.` },
                        { role: "user", content: text }
                    ],
                    temperature: 0.1
                })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                return res.status(response.status).json({ error: data.error?.message || 'OpenAI API Error' });
            }

            if (data.choices && data.choices.length > 0) {
                return res.json({ translatedText: data.choices[0].message.content.trim() });
            } else {
                return res.status(500).json({ error: 'No translation returned from OpenAI' });
            }
        } else {
            return res.status(400).json({ error: 'Invalid engine type' });
        }
    } catch (error) {
        console.error("Translation Error:", error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(PORT, () => {
    console.log(`Node.js Translation Server running on http://localhost:${PORT}`);
});
