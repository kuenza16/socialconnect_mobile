// components/CallScreen.tsx
import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { RTCView } from 'react-native-webrtc';

interface CallScreenProps {
  isCalling: boolean;
  callActive: boolean;
  callType: 'audio' | 'video' | null;
  callerName: string;
  localStream: any;
  remoteStream: any;
  onEndCall: () => void;
  onClose: () => void;
}

export default function CallScreen({
  isCalling,
  callActive,
  callType,
  callerName,
  localStream,
  remoteStream,
  onEndCall,
  onClose,
}: CallScreenProps) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.callContainer}>
        {callType === 'video' && remoteStream && (
          <RTCView
            streamURL={remoteStream.toURL()}
            style={styles.remoteVideo}
            objectFit="cover"
          />
        )}
        
        {callType === 'video' && localStream && (
          <RTCView
            streamURL={localStream.toURL()}
            style={styles.localVideo}
            objectFit="cover"
          />
        )}
        
        <View style={styles.callInfo}>
          <Text style={styles.callerName}>{callerName}</Text>
          <Text style={styles.callStatus}>
            {isCalling && 'Calling...'}
            {callActive && `${callType === 'video' ? 'Video' : 'Audio'} call in progress`}
          </Text>
        </View>
        
        <TouchableOpacity style={styles.endCallButton} onPress={onEndCall}>
          <Text style={styles.endCallText}>End Call</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  callContainer: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 20,
  },
  remoteVideo: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  localVideo: {
    position: 'absolute',
    top: 40,
    right: 20,
    width: 100,
    height: 150,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
  },
  callInfo: {
    alignItems: 'center',
    marginTop: 100,
    zIndex: 1,
  },
  callerName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 10,
  },
  callStatus: {
    fontSize: 16,
    color: '#ccc',
  },
  endCallButton: {
    backgroundColor: '#f44336',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 30,
  },
  endCallText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});