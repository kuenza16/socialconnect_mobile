import { useLocalSearchParams } from "expo-router";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import {
    Alert,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    PermissionsAndroid,
    Platform,
    SafeAreaView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import AppHeader from "@/components/AppHeader";
import { Colors, Radius, Spacing, Typography } from "@/constants/Colors";
import { useAuth } from "@/hooks/useAuth";
import { useWebSocket } from "@/hooks/useWebSocket";
import API from "@/services/api";

type ChatMessage = {
  _id: string;
  text: string;
  senderId: string;
  createdAt: string;
  receiverId?: string;
};

type CallType = "audio" | "video";

type IncomingCallState = {
  from: string;
  offer?: any;
  signalData?: any;
  callType: CallType;
};

const ICE_SERVERS = [{ urls: "stun:stun.l.google.com:19302" }];

function extractId(raw: any): string {
  if (!raw) {
    return "";
  }

  if (typeof raw === "string" || typeof raw === "number") {
    return String(raw).trim();
  }

  if (typeof raw === "object") {
    const nested =
      raw.$oid ??
      raw._id ??
      raw.id ??
      raw.userId ??
      raw.senderId ??
      raw.receiverId ??
      raw.from ??
      raw.to;

    if (nested && nested !== raw) {
      return extractId(nested);
    }
  }

  return "";
}

function normalizeMessage(raw: any, index: number): ChatMessage {
  return {
    _id: String(raw?._id ?? raw?.id ?? `message-${index}`),
    text: String(raw?.text ?? raw?.content ?? raw?.message ?? ""),
    senderId: extractId(
      raw?.senderId ??
        raw?.sender ??
        raw?.senderUser ??
        raw?.user ??
        raw?.from ??
        raw?.createdBy,
    ),
    receiverId: extractId(raw?.receiverId ?? raw?.receiver ?? raw?.to),
    createdAt: String(
      raw?.createdAt ?? raw?.updatedAt ?? new Date().toISOString(),
    ),
  };
}

function formatTime(isoDate?: string): string {
  if (!isoDate) {
    return "";
  }

  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function getOrCreateConversationId(friendId: string): Promise<string> {
  const { data } = await API.post(`/chat/conversation/${friendId}`);

  const resolved =
    (data as any)?.conversationId ??
    (data as any)?.chatId ??
    (data as any)?._id ??
    (data as any)?.id ??
    (data as any)?.conversation?._id ??
    (data as any)?.conversation?.id ??
    (data as any)?.data?._id ??
    (data as any)?.data?.id ??
    (data as any)?.data?.conversationId ??
    "";

  return String(resolved || "");
}

async function fetchMessages(conversationId: string): Promise<ChatMessage[]> {
  const { data } = await API.get(`/chat/messages/${conversationId}`);
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as any)?.messages)
      ? (data as any).messages
      : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];

  return list.map((item: any, index: number) => normalizeMessage(item, index));
}

async function postMessage(
  conversationId: string,
  text: string,
  fallbackSenderId?: string,
): Promise<ChatMessage | null> {
  const { data } = await API.post(`/chat/messages/${conversationId}`, {
    message: text,
  });

  const raw =
    (data as any)?.messageData ??
    (data as any)?.message ??
    (data as any)?.data ??
    data;

  if (!raw || typeof raw !== "object") {
    return null;
  }

  const normalized = normalizeMessage(raw, Date.now());

  if (!normalized.senderId && fallbackSenderId) {
    return {
      ...normalized,
      senderId: String(fallbackSenderId),
    };
  }

  return normalized;
}

export default function ChatThreadScreen() {
  const {
    friendId: rawFriendId,
    friendName: rawFriendName,
    peerUserId: rawPeerUserId,
    chatId: rawChatId,
  } = useLocalSearchParams<{
    friendId?: string;
    friendName?: string;
    peerUserId?: string;
    chatId?: string;
  }>();

  const { user } = useAuth();
  const { socket, connect } = useWebSocket(true);

  const flatListRef = useRef<FlatList<ChatMessage>>(null);
  const peerConnectionRef = useRef<any>(null);
  const pendingCandidatesRef = useRef<any[]>([]);
  const callTargetRef = useRef<string>("");

  const [webrtcModule, setWebrtcModule] = useState<any>(null);

  useEffect(() => {
    let mounted = true;

    import("react-native-webrtc")
      .then((mod) => {
        if (!mounted) {
          return;
        }
        setWebrtcModule((mod as any)?.default ?? mod);
      })
      .catch(() => {
        if (!mounted) {
          return;
        }
        setWebrtcModule(null);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const mediaDevices = webrtcModule?.mediaDevices;
  const RTCPeerConnectionClass = webrtcModule?.RTCPeerConnection;
  const RTCIceCandidateClass = webrtcModule?.RTCIceCandidate;
  const RTCSessionDescriptionClass = webrtcModule?.RTCSessionDescription;
  const RTCView = webrtcModule?.RTCView;

  const WEBRTC_AVAILABLE = useMemo(
    () =>
      Boolean(
        mediaDevices &&
        RTCPeerConnectionClass &&
        RTCIceCandidateClass &&
        RTCSessionDescriptionClass,
      ),
    [
      mediaDevices,
      RTCPeerConnectionClass,
      RTCIceCandidateClass,
      RTCSessionDescriptionClass,
    ],
  );

  const friendId = useMemo(() => String(rawFriendId ?? ""), [rawFriendId]);
  const friendName = useMemo(
    () => String(rawFriendName ?? "Chat"),
    [rawFriendName],
  );
  const peerUserId = useMemo(
    () => (rawPeerUserId ? String(rawPeerUserId) : ""),
    [rawPeerUserId],
  );
  const chatId = useMemo(
    () => (rawChatId ? String(rawChatId) : ""),
    [rawChatId],
  );
  const currentUserId = useMemo(
    () =>
      extractId(
        (user as any)?._id ?? (user as any)?.id ?? (user as any)?.userId,
      ),
    [user],
  );

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState(() =>
    chatId ? String(chatId) : "",
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);

  // Required call states
  const [incomingCall, setIncomingCall] = useState<IncomingCallState | null>(
    null,
  );
  const [callActive, setCallActive] = useState(false);
  const [isCalling, setIsCalling] = useState(false);
  const [activeCallType, setActiveCallType] = useState<CallType | null>(null);
  const [localStream, setLocalStream] = useState<any>(null);
  const [remoteStream, setRemoteStream] = useState<any>(null);

  const stopStream = useCallback((stream: any) => {
    if (!stream) {
      return;
    }
    stream.getTracks?.().forEach((track: any) => {
      try {
        track.stop();
      } catch {
        // ignore
      }
    });
  }, []);

  const cleanupCall = useCallback(
    (emitSignal = false) => {
      if (emitSignal && socket?.connected && callTargetRef.current) {
        const payload = {
          to: callTargetRef.current,
          from: currentUserId,
          toUserId: callTargetRef.current,
          fromUserId: currentUserId,
        };
        socket.emit("call:end", payload);
        socket.emit("call:ended", payload);
      }

      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch {
          // ignore
        }
        peerConnectionRef.current = null;
      }

      stopStream(localStream);
      stopStream(remoteStream);

      pendingCandidatesRef.current = [];
      callTargetRef.current = "";
      setLocalStream(null);
      setRemoteStream(null);
      setIncomingCall(null);
      setCallActive(false);
      setIsCalling(false);
      setActiveCallType(null);
    },
    [socket, currentUserId, localStream, remoteStream, stopStream],
  );

  const applyPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) {
      return;
    }

    const queue = [...pendingCandidatesRef.current];
    pendingCandidatesRef.current = [];

    for (const candidate of queue) {
      try {
        if (!RTCIceCandidateClass) {
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidateClass(candidate));
      } catch {
        // ignore
      }
    }
  }, [RTCIceCandidateClass]);

  const requestCallPermissions = useCallback(
    async (type: CallType): Promise<boolean> => {
      if (Platform.OS !== "android") {
        return true;
      }

      const permissions = [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      if (type === "video") {
        permissions.push(PermissionsAndroid.PERMISSIONS.CAMERA);
      }

      const result = await PermissionsAndroid.requestMultiple(permissions);

      const micGranted =
        result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] ===
        PermissionsAndroid.RESULTS.GRANTED;
      const camGranted =
        type === "audio" ||
        result[PermissionsAndroid.PERMISSIONS.CAMERA] ===
          PermissionsAndroid.RESULTS.GRANTED;

      return micGranted && camGranted;
    },
    [],
  );

  const createLocalStream = useCallback(
    async (type: CallType) => {
      if (!mediaDevices?.getUserMedia) {
        throw new Error("WebRTC is unavailable in this runtime.");
      }

      return mediaDevices.getUserMedia({
        audio: true,
        video:
          type === "video"
            ? {
                facingMode: "user",
                width: 640,
                height: 480,
                frameRate: 24,
              }
            : false,
      });
    },
    [mediaDevices],
  );

  const createPeerConnection = useCallback(
    (targetUserId: string, stream: any) => {
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close();
        } catch {
          // ignore
        }
      }

      if (!RTCPeerConnectionClass) {
        throw new Error("WebRTC is unavailable in this runtime.");
      }

      const pc: any = new RTCPeerConnectionClass({ iceServers: ICE_SERVERS });
      peerConnectionRef.current = pc;

      stream.getTracks().forEach((track: any) => {
        pc.addTrack(track, stream);
      });

      pc.onicecandidate = (event: any) => {
        if (event.candidate && socket?.connected) {
          const payload = {
            to: targetUserId,
            from: currentUserId,
            toUserId: targetUserId,
            fromUserId: currentUserId,
            candidate: event.candidate,
          };
          socket.emit("ice-candidate", payload);
          socket.emit("call:ice-candidate", payload);
        }
      };

      pc.ontrack = (event: any) => {
        const incoming = event.streams?.[0];
        if (incoming) {
          setRemoteStream(incoming);
        }
      };

      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        if (
          state === "failed" ||
          state === "disconnected" ||
          state === "closed"
        ) {
          cleanupCall(false);
        }
      };

      return pc;
    },
    [socket, currentUserId, cleanupCall, RTCPeerConnectionClass],
  );

  const loadMessages = useCallback(async () => {
    if (!friendId) {
      return;
    }

    setLoading(true);

    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        activeConversationId = await getOrCreateConversationId(
          peerUserId || friendId,
        );
        setConversationId(activeConversationId);
      }

      if (!activeConversationId) {
        throw new Error("Conversation not found");
      }

      const next = await fetchMessages(activeConversationId);
      setMessages(next);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to load messages",
      );
    } finally {
      setLoading(false);
    }
  }, [friendId, conversationId, peerUserId]);

  useEffect(() => {
    loadMessages();
  }, [loadMessages]);

  useEffect(() => {
    if (!socket || !currentUserId) {
      return;
    }

    socket.emit("join-user", { userId: currentUserId });
    socket.emit("user:join", { userId: currentUserId });
    socket.emit("joinRoom", currentUserId);
  }, [socket, currentUserId]);

  const handleStartCall = useCallback(
    async (type: CallType) => {
      const targetUserId = peerUserId || friendId;

      let activeSocket = socket;
      if (!activeSocket || !activeSocket.connected) {
        activeSocket = await connect();
      }

      if (!activeSocket || !activeSocket.connected) {
        Alert.alert("Call Error", "Socket is not connected yet.");
        return;
      }

      if (!targetUserId || !currentUserId) {
        Alert.alert("Call Error", "Missing user identifiers for call.");
        return;
      }

      if (!WEBRTC_AVAILABLE) {
        Alert.alert(
          "Development build required",
          "react-native-webrtc does not run in Expo Go. Please open this app with an Expo development build.",
        );
        return;
      }

      const granted = await requestCallPermissions(type);
      if (!granted) {
        Alert.alert(
          "Permission required",
          "Please allow microphone/camera permissions.",
        );
        return;
      }

      try {
        const stream = await createLocalStream(type);
        setLocalStream(stream);
        setRemoteStream(null);
        setIncomingCall(null);
        setActiveCallType(type);
        setIsCalling(true);
        setCallActive(false);
        callTargetRef.current = targetUserId;

        const pc = createPeerConnection(targetUserId, stream);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const payload = {
          to: targetUserId,
          from: currentUserId,
          toUserId: targetUserId,
          fromUserId: currentUserId,
          callerName: (user as any)?.name,
          callType: type,
          offer,
          signalData: { sdp: offer.sdp, type: offer.type },
          conversationId,
        };

        activeSocket.emit("call:user", payload);
      } catch (error: any) {
        cleanupCall(false);
        Alert.alert("Call Error", error?.message || "Failed to start call");
      }
    },
    [
      peerUserId,
      friendId,
      currentUserId,
      socket,
      connect,
      requestCallPermissions,
      createLocalStream,
      createPeerConnection,
      conversationId,
      WEBRTC_AVAILABLE,
      user,
      cleanupCall,
    ],
  );

  const acceptIncomingCall = useCallback(async () => {
    if (!incomingCall || !socket) {
      return;
    }

    const targetUserId = incomingCall.from;
    const type = incomingCall.callType;

    const granted = await requestCallPermissions(type);
    if (!granted) {
      Alert.alert(
        "Permission required",
        "Please allow microphone/camera permissions.",
      );
      return;
    }

    try {
      const stream = await createLocalStream(type);
      setLocalStream(stream);
      setRemoteStream(null);
      setActiveCallType(type);
      setCallActive(true);
      setIsCalling(false);
      setIncomingCall(null);
      callTargetRef.current = targetUserId;

      const pc = createPeerConnection(targetUserId, stream);

      const remoteOffer = incomingCall.offer ?? incomingCall.signalData;
      if (remoteOffer) {
        if (!RTCSessionDescriptionClass) {
          throw new Error("WebRTC session description is unavailable.");
        }
        await pc.setRemoteDescription(
          new RTCSessionDescriptionClass(remoteOffer),
        );
      }

      await applyPendingCandidates();

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const payload = {
        to: targetUserId,
        from: currentUserId,
        toUserId: targetUserId,
        fromUserId: currentUserId,
        answer,
        signalData: { sdp: answer.sdp, type: answer.type },
      };

      socket.emit("call:accepted", payload);
      socket.emit("call:answer", payload);
    } catch (error: any) {
      cleanupCall(false);
      Alert.alert("Call Error", error?.message || "Failed to accept call");
    }
  }, [
    incomingCall,
    socket,
    requestCallPermissions,
    createLocalStream,
    createPeerConnection,
    applyPendingCandidates,
    currentUserId,
    RTCSessionDescriptionClass,
    cleanupCall,
  ]);

  const rejectIncomingCall = useCallback(() => {
    if (socket?.connected && incomingCall?.from) {
      const payload = {
        to: incomingCall.from,
        from: currentUserId,
        toUserId: incomingCall.from,
        fromUserId: currentUserId,
      };
      socket.emit("call:ended", payload);
      socket.emit("call:end", payload);
    }

    setIncomingCall(null);
    setIsCalling(false);
    setActiveCallType(null);
  }, [socket, incomingCall, currentUserId]);

  const endActiveCall = useCallback(() => {
    cleanupCall(true);
  }, [cleanupCall]);

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onIncomingCall = (payload: any) => {
      const from = extractId(
        payload?.from ??
          payload?.fromUserId ??
          payload?.callerId ??
          payload?.userId,
      );
      if (!from) {
        return;
      }

      const callType: CallType =
        payload?.callType === "video" ? "video" : "audio";
      setIncomingCall({
        from,
        offer: payload?.offer,
        signalData: payload?.signalData,
        callType,
      });
      setActiveCallType(callType);
      setIsCalling(false);
    };

    const onCallAccepted = async (payload: any) => {
      const answer = payload?.answer ?? payload?.signalData;
      if (
        !answer ||
        !peerConnectionRef.current ||
        !RTCSessionDescriptionClass
      ) {
        return;
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescriptionClass(answer),
        );
        await applyPendingCandidates();
        setCallActive(true);
        setIsCalling(false);
      } catch {
        cleanupCall(false);
      }
    };

    const onCallAnswer = async (payload: any) => {
      const answer = payload?.answer ?? payload?.signalData;
      if (
        !answer ||
        !peerConnectionRef.current ||
        !RTCSessionDescriptionClass
      ) {
        return;
      }

      try {
        await peerConnectionRef.current.setRemoteDescription(
          new RTCSessionDescriptionClass(answer),
        );
        await applyPendingCandidates();
        setCallActive(true);
        setIsCalling(false);
      } catch {
        cleanupCall(false);
      }
    };

    const onIceCandidate = async (payload: any) => {
      const candidate = payload?.candidate;
      if (!candidate) {
        return;
      }

      const pc = peerConnectionRef.current;
      if (!pc || !pc.remoteDescription) {
        pendingCandidatesRef.current.push(candidate);
        return;
      }

      try {
        if (!RTCIceCandidateClass) {
          return;
        }
        await pc.addIceCandidate(new RTCIceCandidateClass(candidate));
      } catch {
        // ignore
      }
    };

    const onRemoteEnded = () => {
      cleanupCall(false);
    };

    socket.on("call:incoming", onIncomingCall);
    socket.on("call:accepted", onCallAccepted);
    socket.on("call:answer", onCallAnswer);
    socket.on("call:end", onRemoteEnded);
    socket.on("call:ended", onRemoteEnded);
    socket.on("ice-candidate", onIceCandidate);
    socket.on("call:ice-candidate", onIceCandidate);

    return () => {
      socket.off("call:incoming", onIncomingCall);
      socket.off("call:accepted", onCallAccepted);
      socket.off("call:answer", onCallAnswer);
      socket.off("call:end", onRemoteEnded);
      socket.off("call:ended", onRemoteEnded);
      socket.off("ice-candidate", onIceCandidate);
      socket.off("call:ice-candidate", onIceCandidate);
      cleanupCall(false);
    };
  }, [
    socket,
    applyPendingCandidates,
    cleanupCall,
    RTCSessionDescriptionClass,
    RTCIceCandidateClass,
  ]);

  useEffect(() => {
    if (!socket || !friendId) {
      return;
    }

    const roomPayload = { userId: currentUserId, friendId };
    socket.emit("join-chat", roomPayload);
    socket.emit("chat:join", roomPayload);
    socket.emit("joinRoom", friendId);

    const onIncomingMessage = (raw: any) => {
      const next = normalizeMessage(raw, Date.now());
      setMessages((prev) => {
        const exists = prev.some((m) => m._id === next._id);
        if (exists) {
          return prev;
        }
        return [...prev, next];
      });
    };

    socket.on("new-message", onIncomingMessage);
    socket.on("newMessage", onIncomingMessage);
    socket.on("message", onIncomingMessage);
    socket.on("chat:message", onIncomingMessage);

    return () => {
      socket.off("new-message", onIncomingMessage);
      socket.off("newMessage", onIncomingMessage);
      socket.off("message", onIncomingMessage);
      socket.off("chat:message", onIncomingMessage);
    };
  }, [socket, friendId, currentUserId]);

  const onSend = useCallback(async () => {
    const text = input.trim();
    if (!text || !friendId || sending) {
      return;
    }

    setSending(true);

    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage: ChatMessage = {
      _id: optimisticId,
      text,
      senderId: currentUserId,
      receiverId: peerUserId || friendId,
      createdAt: new Date().toISOString(),
    };

    setInput("");
    setMessages((prev) => [...prev, optimisticMessage]);

    try {
      let activeConversationId = conversationId;
      if (!activeConversationId) {
        activeConversationId = await getOrCreateConversationId(
          peerUserId || friendId,
        );
        setConversationId(activeConversationId);
      }

      if (!activeConversationId) {
        throw new Error("Conversation not found");
      }

      const sent = await postMessage(activeConversationId, text, currentUserId);
      if (sent) {
        setMessages((prev) =>
          prev.map((m) => (m._id === optimisticId ? sent : m)),
        );
      }

      if (socket?.connected) {
        socket.emit("send-message", {
          to: peerUserId || friendId,
          message: text,
          content: text,
          text,
          conversationId: activeConversationId,
        });
      }
    } catch (error: any) {
      setMessages((prev) => prev.filter((m) => m._id !== optimisticId));
      setInput(text);
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Failed to send message",
      );
    } finally {
      setSending(false);
    }
  }, [
    friendId,
    input,
    sending,
    currentUserId,
    peerUserId,
    conversationId,
    socket,
  ]);

  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    flatListRef.current?.scrollToEnd({ animated: true });
  }, [messages.length]);

  if (!friendId) {
    return (
      <SafeAreaView style={styles.container}>
        <AppHeader title="Chat" subtitle="Invalid conversation" />
        <View style={styles.invalidContainer}>
          <Text style={styles.invalidTitle}>Conversation not found</Text>
          <Text style={styles.invalidSubtitle}>
            Please go back and open chat from the conversations list.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const showCallModal = Boolean(incomingCall || isCalling || callActive);

  return (
    <SafeAreaView style={styles.container}>
      <AppHeader
        title={friendName || "Chat"}
        subtitle={
          !WEBRTC_AVAILABLE
            ? "Calls require a development build"
            : loading
              ? "Loading messages..."
              : "Online"
        }
        rightActions={[
          { icon: "call-outline", onPress: () => handleStartCall("audio") },
          { icon: "videocam-outline", onPress: () => handleStartCall("video") },
          { icon: "refresh", onPress: loadMessages },
        ]}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardContainer}
        keyboardVerticalOffset={Platform.OS === "ios" ? 88 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, index) => String(item._id ?? `message-${index}`)}
          contentContainerStyle={styles.messagesContainer}
          renderItem={({ item }) => {
            const isMe = String(item.senderId) === String(currentUserId);

            return (
              <View
                style={[
                  styles.messageRow,
                  isMe ? styles.messageRowMine : styles.messageRowTheirs,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleMine : styles.bubbleTheirs,
                  ]}
                >
                  <Text
                    style={[
                      styles.bubbleText,
                      isMe ? styles.bubbleTextMine : null,
                    ]}
                  >
                    {item.text}
                  </Text>
                  <Text
                    style={[
                      styles.bubbleTime,
                      isMe ? styles.bubbleTimeMine : null,
                    ]}
                  >
                    {formatTime(item.createdAt)}
                  </Text>
                </View>
              </View>
            );
          }}
          ListEmptyComponent={
            !loading ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyStateTitle}>No messages yet</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Send the first message to start this conversation.
                </Text>
              </View>
            ) : null
          }
        />

        <View style={styles.inputContainer}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message"
            placeholderTextColor={Colors.gray}
            style={styles.input}
            multiline
          />
          <TouchableOpacity
            onPress={onSend}
            style={[
              styles.sendButton,
              !input.trim() || sending ? styles.sendButtonDisabled : null,
            ]}
            disabled={!input.trim() || sending}
          >
            <Text style={styles.sendText}>{sending ? "..." : "Send"}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <Modal visible={showCallModal} transparent animationType="slide">
        <View style={styles.callOverlay}>
          <View style={styles.callCard}>
            <Text style={styles.callTitle}>{friendName}</Text>

            {incomingCall ? (
              <Text style={styles.callSubtitle}>
                Incoming {incomingCall.callType} call...
              </Text>
            ) : isCalling ? (
              <Text style={styles.callSubtitle}>
                Calling ({activeCallType || "audio"})...
              </Text>
            ) : callActive ? (
              <Text style={styles.callSubtitle}>
                {activeCallType === "video"
                  ? "Video call active"
                  : "Audio call active"}
              </Text>
            ) : null}

            {activeCallType === "video" ? (
              <View style={styles.videoContainer}>
                {!RTCView ? (
                  <View style={[styles.remoteVideo, styles.videoPlaceholder]}>
                    <Text style={styles.videoPlaceholderText}>
                      Video view unavailable in this runtime.
                    </Text>
                  </View>
                ) : remoteStream ? (
                  <RTCView
                    streamURL={remoteStream.toURL()}
                    style={styles.remoteVideo}
                    objectFit="cover"
                  />
                ) : (
                  <View style={[styles.remoteVideo, styles.videoPlaceholder]}>
                    <Text style={styles.videoPlaceholderText}>
                      Waiting for remote video...
                    </Text>
                  </View>
                )}

                {RTCView && localStream ? (
                  <RTCView
                    streamURL={localStream.toURL()}
                    style={styles.localVideo}
                    objectFit="cover"
                    mirror
                  />
                ) : null}
              </View>
            ) : (
              <View style={styles.audioCallContainer}>
                <Text style={styles.audioCallText}>Audio Call</Text>
              </View>
            )}

            {incomingCall ? (
              <View style={styles.callButtonsRow}>
                <TouchableOpacity
                  style={[styles.callButton, styles.rejectButton]}
                  onPress={rejectIncomingCall}
                >
                  <Text style={styles.callButtonText}>Reject</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.callButton, styles.acceptButton]}
                  onPress={acceptIncomingCall}
                >
                  <Text style={styles.callButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={[styles.callButton, styles.endButton]}
                onPress={endActiveCall}
              >
                <Text style={styles.callButtonText}>End Call</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardContainer: {
    flex: 1,
  },
  invalidContainer: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  invalidTitle: {
    color: Colors.black,
    fontSize: Typography.title,
    fontWeight: "700",
  },
  invalidSubtitle: {
    marginTop: Spacing.xs,
    color: Colors.gray,
    fontSize: Typography.body,
  },
  messagesContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    gap: Spacing.sm,
  },
  messageRow: {
    width: "100%",
    flexDirection: "row",
  },
  messageRowMine: {
    justifyContent: "flex-end",
  },
  messageRowTheirs: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleMine: {
    backgroundColor: "#1E88E5",
    borderBottomRightRadius: 4,
  },
  bubbleTheirs: {
    backgroundColor: "#F2F4F7",
    borderWidth: 1,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  bubbleText: {
    color: Colors.black,
    fontSize: Typography.bodyLarge,
  },
  bubbleTextMine: {
    color: Colors.white,
  },
  bubbleTime: {
    marginTop: 4,
    color: Colors.gray,
    fontSize: 11,
    alignSelf: "flex-end",
  },
  bubbleTimeMine: {
    color: "rgba(255,255,255,0.85)",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    backgroundColor: Colors.white,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    minHeight: 42,
    maxHeight: 120,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    color: Colors.black,
    fontSize: Typography.body,
    backgroundColor: Colors.background,
  },
  sendButton: {
    height: 42,
    paddingHorizontal: Spacing.md,
    borderRadius: Radius.md,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  sendText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: Typography.body,
  },
  emptyState: {
    marginTop: Spacing.xxl,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.white,
  },
  emptyStateTitle: {
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.black,
  },
  emptyStateSubtitle: {
    marginTop: Spacing.xs,
    fontSize: Typography.body,
    color: Colors.gray,
  },
  callOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    paddingHorizontal: Spacing.lg,
  },
  callCard: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  callTitle: {
    fontSize: Typography.headline,
    fontWeight: "700",
    color: Colors.black,
    textAlign: "center",
  },
  callSubtitle: {
    fontSize: Typography.body,
    color: Colors.gray,
    textAlign: "center",
  },
  videoContainer: {
    width: "100%",
    height: 320,
    borderRadius: Radius.md,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  remoteVideo: {
    width: "100%",
    height: "100%",
  },
  localVideo: {
    position: "absolute",
    right: 10,
    bottom: 10,
    width: 110,
    height: 160,
    borderRadius: Radius.sm,
    borderWidth: 1,
    borderColor: Colors.white,
    backgroundColor: "#111",
  },
  videoPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#111",
  },
  videoPlaceholderText: {
    color: Colors.white,
    fontSize: Typography.body,
  },
  audioCallContainer: {
    width: "100%",
    minHeight: 140,
    borderRadius: Radius.md,
    backgroundColor: "#111827",
    alignItems: "center",
    justifyContent: "center",
  },
  audioCallText: {
    color: Colors.white,
    fontSize: Typography.title,
    fontWeight: "700",
  },
  callButtonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: Spacing.md,
  },
  callButton: {
    flex: 1,
    height: 46,
    borderRadius: Radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  acceptButton: {
    backgroundColor: "#16A34A",
  },
  rejectButton: {
    backgroundColor: "#DC2626",
  },
  endButton: {
    backgroundColor: "#DC2626",
  },
  callButtonText: {
    color: Colors.white,
    fontWeight: "700",
    fontSize: Typography.body,
  },
});
