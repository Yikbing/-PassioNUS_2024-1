import React, { useEffect } from "react";
import { Box, VStack, Text } from "@chakra-ui/react";
import { ChatState } from "../../Context/ChatProvider";
import axios from "axios";
import io from "socket.io-client";

const ENDPOINT = "http://localhost:8080";
var socket;

const MyChats = () => {
  const { chats, setChats, selectedChat, setSelectedChat } = ChatState();

  useEffect(() => {
    const fetchChats = async () => {
      try {
        const token = localStorage.getItem("token");
        const { data } = await axios.get("http://localhost:8080/api/chat", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        setChats(data);
      } catch (error) {
        console.error("Failed to load chats", error);
        setChats([]); // Ensure chats is set to an empty array on error
      }
    };

    fetchChats();
  }, [setChats]);

  useEffect(() => {
    socket = io(ENDPOINT);
    const userId = localStorage.getItem("userId");
    socket.emit("setup", userId);

    socket.on("message received", (newMessageReceived) => {
      updateLatestMessage(newMessageReceived);
    });

    // Listen for custom event
    const handleMessageSent = (event) => {
      updateLatestMessage(event.detail);
    };
    window.addEventListener("message-sent", handleMessageSent);

    return () => {
      socket.disconnect();
      window.removeEventListener("message-sent", handleMessageSent);
    };
  }, []);

  const updateLatestMessage = (newMessageReceived) => {
    setChats((prevChats) => {
      const updatedChats = prevChats.map((chat) => {
        if (chat._id === newMessageReceived.chat._id) {
          chat.latestMessage = newMessageReceived;
        }
        return chat;
      });
      return updatedChats;
    });
  };

  return (
    <Box mt={4}>
      <Text fontSize="2xl" mb={4}>
        My Chats
      </Text>
      <VStack spacing={4} align="stretch">
        {chats && chats.length > 0 ? (
          chats.map((chat) => (
            <Box
              key={chat._id}
              p={4}
              bg={
                selectedChat && selectedChat._id === chat._id
                  ? "blue.100"
                  : "gray.100"
              } // Highlight the selected chat
              borderRadius="md"
              onClick={() => setSelectedChat(chat)}
              cursor="pointer"
            >
              <Text fontWeight="bold">
                {chat.isGroupChat
                  ? chat.chatName
                  : chat.users.find((u) => u._id !== chat._id).name}
              </Text>
              {chat.latestMessage && (
                <Text mt={1} fontSize="sm" color="gray.500">
                  <strong>{chat.latestMessage.sender.name}: </strong>
                  {chat.latestMessage.content.length > 50
                    ? `${chat.latestMessage.content.substring(0, 50)}...`
                    : chat.latestMessage.content}
                </Text>
              )}
            </Box>
          ))
        ) : (
          <Text>No chats available</Text>
        )}
      </VStack>
    </Box>
  );
};

export default MyChats;