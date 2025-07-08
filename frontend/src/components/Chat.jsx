import React, { useState, useEffect, useRef, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import io from 'socket.io-client';

const Chat = ({ appointmentId, doctorId }) => {
  const { token, userData, backendUrl } = useContext(AppContext);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Connect to Socket.IO server
    const newSocket = io(backendUrl, {
      withCredentials: true,
      extraHeaders: {
        "token": token
      }
    });
    setSocket(newSocket);

    // Join appointment room
    newSocket.emit('join-appointment', appointmentId);

    // Load chat history
    const fetchMessages = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/chat/${appointmentId}`, {
          headers: { token }
        });
        const data = await response.json();
        if (data.success) {
          setMessages(data.messages);
        }
      } catch (error) {
        console.error('Failed to fetch messages', error);
      }
    };
    fetchMessages();

    // Listen for new messages
    newSocket.on('receive-message', (message) => {
      setMessages(prev => [...prev, message]);
    });

    return () => {
      newSocket.disconnect();
    };
  }, [appointmentId, token, backendUrl]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = () => {
    if (newMessage.trim() === '') return;

    socket.emit('send-message', {
      appointmentId,
      senderId: userData._id,
      senderType: 'patient',
      message: newMessage
    });

    // Send notification to doctor
    if (doctorId) {
      socket.emit('send-notification', {
        receiverId: doctorId,
        senderName: userData.name,
        appointmentId
      });
    }

    setNewMessage('');
  };

  return (
    <div className="border rounded-lg p-4 h-[400px] flex flex-col">
      <div className="font-semibold mb-3">Chat with Doctor</div>
      <div className="flex-1 overflow-y-auto mb-3">
        {messages.map((msg, index) => (
          <div 
            key={index} 
            className={`mb-2 ${msg.senderType === 'patient' ? 'text-right' : ''}`}
          >
            <div className={`inline-block p-2 rounded-lg ${
              msg.senderType === 'patient' 
                ? 'bg-blue-100 text-blue-900' 
                : 'bg-gray-100 text-gray-900'
            }`}>
              {msg.message}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {new Date(msg.timestamp).toLocaleTimeString()}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="flex">
        <input
          type="text"
          className="flex-1 border rounded-l-lg p-2"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Type a message..."
        />
        <button
          className="bg-primary text-white px-4 rounded-r-lg"
          onClick={handleSendMessage}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;