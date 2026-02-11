import React, { useState, useEffect, useRef } from 'react';
import './Terminal.css';

const Terminal = () => {
    const [messages, setMessages] = useState(["Connecting to game server..."]);
    const [input, setInput] = useState("");
    const [connected, setConnected] = useState(false);
    const ws = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    const handleContainerClick = () => {
        inputRef.current?.focus();
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        // Backend now runs on 8010
        ws.current = new WebSocket("ws://localhost:8010/ws/game");

        ws.current.onopen = () => {
            console.log("Connected to WebSocket");
            setConnected(true);
            setMessages((prev) => [...prev, "--- Connected to server ---"]);
        };

        ws.current.onmessage = (event) => {
            // Check if it's a multiline message
            const lines = event.data.split('\n');
            setMessages((prev) => [...prev, ...lines]);
        };

        ws.current.onclose = () => {
            console.log("Disconnected from WebSocket");
            setConnected(false);
            setMessages((prev) => [...prev, "--- Disconnected from server ---"]);
        };

        return () => {
            if (ws.current) {
                ws.current.close();
            }
        };
    }, []);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (input.trim() || input === "") {
            setMessages((prev) => [...prev, `> ${input}`]);
        }

        if (ws.current && connected) {
            ws.current.send(input);
        }
        setInput("");
    };

    return (
        <div className="terminal-container" onClick={handleContainerClick}>
            <div className="terminal-output">
                {messages.map((msg, i) => (
                    <div key={i} className="terminal-line">
                        {msg}
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} className="terminal-input-form">
                <span className="terminal-prompt">&gt;</span>
                <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    className="terminal-input"
                    autoFocus
                />
            </form>
        </div>
    );
};

export default Terminal;
