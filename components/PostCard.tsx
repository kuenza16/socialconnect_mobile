import React, { useMemo, useState } from "react";
import {
    Alert,
    FlatList,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";

import { Colors, Radius, Spacing, Typography } from "@/constants/Colors";
import API from "@/services/api";
import { formatRelativeDate } from "@/utils/date";

interface User {
  _id: string;
  name: string;
}

interface Comment {
  _id: string;
  content: string;
  createdAt: string;
  user: User;
}

export interface Post {
  _id: string;
  content: string;
  createdAt: string;
  user: User;
  likes: string[];
  comments: Comment[];
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  onRefresh?: () => void;
}

export default function PostCard({
  post,
  currentUserId,
  onRefresh,
}: PostCardProps) {
  const [comment, setComment] = useState("");
  const liked = useMemo(
    () => (currentUserId ? post.likes?.includes(currentUserId) : false),
    [post.likes, currentUserId],
  );

  const handleLike = async () => {
    try {
      await API.post(`/posts/${post._id}/like`);
      onRefresh?.();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Unable to like post",
      );
    }
  };

  const handleComment = async () => {
    if (!comment.trim()) {
      return;
    }

    try {
      await API.post(`/posts/${post._id}/comment`, { content: comment.trim() });
      setComment("");
      onRefresh?.();
    } catch (error: any) {
      Alert.alert(
        "Error",
        error?.response?.data?.message || "Unable to add comment",
      );
    }
  };

  return (
    <View style={styles.card}>
      <Text style={styles.author}>{post.user?.name || "Unknown user"}</Text>
      <Text style={styles.date}>{formatRelativeDate(post.createdAt)}</Text>
      <Text style={styles.content}>{post.content}</Text>

      <TouchableOpacity style={styles.likeButton} onPress={handleLike}>
        <Text style={styles.likeText}>
          {liked ? "❤️" : "🤍"} {post.likes?.length || 0} likes
        </Text>
      </TouchableOpacity>

      <View style={styles.commentRow}>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Write a comment"
          style={styles.commentInput}
        />
        <TouchableOpacity style={styles.commentButton} onPress={handleComment}>
          <Text style={styles.commentButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      {post.comments?.length ? (
        <FlatList
          data={post.comments}
          keyExtractor={(item) => item._id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View style={styles.commentItem}>
              <Text style={styles.commentAuthor}>{item.user?.name}</Text>
              <Text style={styles.commentContent}>{item.content}</Text>
            </View>
          )}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  author: {
    fontSize: Typography.title,
    fontWeight: "700",
    color: Colors.black,
  },
  date: {
    marginTop: 2,
    fontSize: Typography.body,
    color: Colors.gray,
  },
  content: {
    marginTop: Spacing.sm,
    fontSize: Typography.bodyLarge,
    color: Colors.black,
    lineHeight: 22,
  },
  likeButton: {
    marginTop: Spacing.md,
  },
  likeText: {
    color: Colors.gray,
    fontWeight: "600",
  },
  commentRow: {
    flexDirection: "row",
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  commentButton: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
    justifyContent: "center",
    paddingHorizontal: Spacing.md,
  },
  commentButtonText: {
    color: Colors.white,
    fontWeight: "700",
  },
  commentItem: {
    marginTop: Spacing.sm,
    backgroundColor: Colors.background,
    borderRadius: Radius.sm,
    padding: Spacing.sm,
  },
  commentAuthor: {
    fontWeight: "700",
    fontSize: Typography.body,
    color: Colors.black,
  },
  commentContent: {
    marginTop: 2,
    color: Colors.gray,
  },
});
