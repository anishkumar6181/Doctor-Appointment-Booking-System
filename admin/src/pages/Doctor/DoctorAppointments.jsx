import React, { useContext, useEffect, useState, useRef } from 'react';
import { DoctorContext } from '../../context/DoctorContext';
import { AppContext } from '../../context/AppContext';
import { assets } from '../../assets/assets_admin/assets';
import io from 'socket.io-client';

const DoctorAppointments = () => {
  const { dToken, appointments, getAppointments, completeAppointment, cancelAppointment, backendUrl } = useContext(DoctorContext);
  const { calculateAge, slotDateFormat, currency } = useContext(AppContext);
  
  // Chat state
  const [activeChat, setActiveChat] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const messagesEndRef = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    if (dToken) {
      getAppointments();
      
      // Initialize socket connection
      const newSocket = io(backendUrl, {
        withCredentials: true,
        auth: { token: dToken } // Unified token field
      });
      setSocket(newSocket);

      return () => newSocket.disconnect();
    }
  }, [dToken]);

  useEffect(() => {
    if (socket) {
      // Listen for new messages
      socket.on('receive-message', handleNewMessage);
      
      // Listen for notifications
      socket.on('receive-notification', handleNotification);
    }
    
    return () => {
      if (socket) {
        socket.off('receive-message');
        socket.off('receive-notification');
      }
    };
  }, [socket, activeChat]);

  const handleNewMessage = (message) => {
    if (message.appointmentId === activeChat) {
      setChatMessages(prev => [...prev, message]);
    } else {
      setUnreadCounts(prev => ({
        ...prev,
        [message.appointmentId]: (prev[message.appointmentId] || 0) + 1
      }));
    }
  };

  const handleNotification = (notification) => {
    console.log('Notification:', notification);
    // Show toast notification here if needed
  };

  const openChat = async (appointmentId) => {
    setActiveChat(appointmentId);
    setUnreadCounts(prev => ({ ...prev, [appointmentId]: 0 }));
    
    try {
      const response = await fetch(`${backendUrl}/api/chat/${appointmentId}`, {
        headers: { Authorization: `Bearer ${dToken}` }
      });
      const data = await response.json();
      if (data.success) {
        setChatMessages(data.messages);
      }
    } catch (error) {
      console.error('Failed to fetch messages', error);
    }
  };

  const sendMessage = () => {
    if (!newMessage.trim() || !socket || !activeChat) return;

    const appointmentData = appointments.find(a => a._id === activeChat);
    
    const messageData = {
      appointmentId: activeChat,
      message: newMessage.trim(),
      senderType: 'doctor',
      appointmentData: appointmentData // For notification
    };

    socket.emit('send-message', messageData);
    
    // Optimistic UI update
    setChatMessages(prev => [...prev, {
      appointmentId: activeChat,
      senderId: appointmentData.docId,
      senderType: 'doctor',
      message: newMessage.trim(),
      timestamp: new Date().toISOString()
    }]);
    
    setNewMessage('');
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  return (
    <div className='w-full max-w-6xl m-5'>
      <p className='mb-3 text-lg font-medium'>All Appointments</p>
      <div className='bg-white border rounded text-sm max-h-[80vh] min-h-[50vh] overflow-y-auto'>
        <div className='max-sm:hidden grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr_1fr] gap-1 py-3 px-6 border-b'>
          <p>#</p>
          <p>Patient</p>
          <p>Payment</p>
          <p>Age</p>
          <p>Date & Time</p>
          <p>Fees</p>
          <p>Action</p>
          <p>Chat</p>
        </div>
        {appointments.map((item, index) => (
          <div className='flex flex-wrap justify-between max-sm:gap-5 max-sm:text-base sm:grid grid-cols-[0.5fr_2fr_1fr_1fr_3fr_1fr_1fr_1fr] gap-1 items-center text-gray-500 py-3 px-6 border-b hover:bg-gray-50' key={index}>
            <p className='max-sm:hidden'>{index+1}</p>
            <div className='flex items-center gap-2'>
              <img className='w-8 rounded-full' src={item.userData.image} alt="" /> 
              <p>{item.userData.name}</p>
            </div>
            <div>
              <p className='text-xs inline border border-primary px-2 rounded-full'>
                {item.payment ? 'Online' : 'CASH'}
              </p>
            </div>
            <p className='max-sm:hidden'>{calculateAge(item.userData.dob)}</p>
            <p>{slotDateFormat(item.slotDate)},{item.slotTime}</p>
            <p>{currency}{item.amount}</p>

            {item.cancelled ? (
              <p className='text-red-400 text-xs font-medium'>Cancelled</p>
            ) : item.isCompleted ? (
              <p className='text-green-500 text-xs font-medium'>Completed</p>
            ) : (
              <div className='flex'>
                <img 
                  onClick={() => cancelAppointment(item._id)} 
                  className='w-10 cursor-pointer' 
                  src={assets.cancel_icon} 
                  alt="Cancel" 
                />
                <img 
                  onClick={() => completeAppointment(item._id)} 
                  className='w-10 cursor-pointer' 
                  src={assets.tick_icon} 
                  alt="Complete" 
                />
              </div>
            )}
            
            <div className="relative">
              <button
                onClick={() => openChat(item._id)}
                className={`px-3 py-1 rounded-full text-sm ${
                  activeChat === item._id 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-200 hover:bg-gray-300'
                }`}
              >
                Chat
              </button>
              {unreadCounts[item._id] > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                  {unreadCounts[item._id]}
                </span>
              )}
            </div>
          </div>  
        ))}
      </div>

      {/* Chat Modal */}
      {activeChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">
                Chat with {appointments.find(a => a._id === activeChat)?.userData.name}
              </h3>
              <button 
                onClick={() => setActiveChat(null)}
                className="text-gray-500 hover:text-gray-700 text-2xl"
              >
                &times;
              </button>
            </div>
            
            <div className="border rounded-lg p-4 h-[400px] flex flex-col">
              <div className="flex-1 overflow-y-auto mb-3">
                {chatMessages.map((msg, index) => (
                  <div 
                    key={index} 
                    className={`mb-2 ${msg.senderType === 'doctor' ? 'text-right' : 'text-left'}`}
                  >
                    <div className={`inline-block p-2 rounded-lg max-w-[80%] ${
                      msg.senderType === 'doctor' 
                        ? 'bg-blue-100 text-blue-900' 
                        : 'bg-gray-100 text-gray-900'
                    }`}>
                      {msg.message}
                    </div>
                    <div className={`text-xs text-gray-500 mt-1 ${msg.senderType === 'doctor' ? 'text-right' : 'text-left'}`}>
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex mt-2">
                <input
                  type="text"
                  className="flex-1 border rounded-l-lg p-2 focus:outline-none"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                />
                <button
                  className="bg-primary text-white px-4 rounded-r-lg hover:bg-blue-600 transition"
                  onClick={sendMessage}
                  disabled={!newMessage.trim()}
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DoctorAppointments;