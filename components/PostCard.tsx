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
import API, { getApiErrorMessage } from "@/services/api";
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
  _id?: string;
  id?: string;
  content: string;
  createdAt?: string;
  created_at?: string;
  user?: User | string;
  author?: User | string;
  likes?: string[];
  comments?: Comment[];
}

interface PostCardProps {
  post: Post;
  currentUserId?: string;
  currentUserName?: string;
  fallbackAuthorName?: string;
  onRefresh?: () => void;
}

export default function PostCard({
  post,
  currentUserId,
  currentUserName,
  fallbackAuthorName,
  onRefresh,
}: PostCardProps) {
  const [comment, setComment] = useState("");
  const [pendingLike, setPendingLike] = useState(false);
  const [pendingComment, setPendingComment] = useState(false);

  const postId = useMemo(
    () => String(post._id ?? post.id ?? ""),
    [post._id, post.id],
  );

  const resolveDisplayName = (raw: any): string | null => {
    if (!raw) {
      return null;
    }

    if (typeof raw === "string") {
      return raw.includes("@") ? raw : null;
    }

    const fromNames =
      raw.name ||
      raw.username ||
      raw.fullName ||
      [raw.firstName, raw.lastName].filter(Boolean).join(" ") ||
      raw.email;

    return fromNames ? String(fromNames) : null;
  };

  const authorName = useMemo(() => {
    const rawAuthor = (post as any).user ?? (post as any).author;
    const topLevelName =
      (post as any).userName ??
      (post as any).username ??
      (post as any).authorName ??
      (post as any).name;

    const direct = resolveDisplayName(rawAuthor);
    if (direct) {
      return direct;
    }

    if (topLevelName) {
      return String(topLevelName);
    }

    if (typeof rawAuthor === "string" && currentUserId && currentUserName) {
      if (String(rawAuthor) === String(currentUserId)) {
        return currentUserName;
      }
    }

    if (fallbackAuthorName) {
      return fallbackAuthorName;
    }

    return "Unknown user";
  }, [post, currentUserId, currentUserName, fallbackAuthorName]);

  const likes = useMemo(() => {
    if (!Array.isArray(post.likes)) {
      return [] as string[];
    }
    return post.likes.map(String);
  }, [post.likes]);

  const comments = useMemo(() => {
    if (!Array.isArray(post.comments)) {
      return [] as Comment[];
    }

    return post.comments.map((item: any, index) => {
      const rawUser = item?.user ?? item?.author ?? item?.createdBy;
      const parsedName =
        resolveDisplayName(rawUser) ||
        item?.userName ||
        item?.authorName ||
        "Unknown user";

      return {
        _id: String(item?._id ?? item?.id ?? `comment-${index}`),
        content: String(item?.content ?? item?.text ?? item?.message ?? ""),
        createdAt: String(item?.createdAt ?? item?.created_at ?? ""),
        user: {
          _id: String(
            (typeof rawUser === "object" &&
              rawUser &&
              (rawUser._id ?? rawUser.id)) ||
              "",
          ),
          name: String(parsedName),
        },
      } as Comment;
    });
  }, [post.comments]);

  const liked = useMemo(
    () => (currentUserId ? likes.includes(String(currentUserId)) : false),
    [likes, currentUserId],
  );

  const handleLike = async () => {
    if (!postId || pendingLike) {
      return;
    }

    try {
      setPendingLike(true);
      await API.post(`/posts/${postId}/like`);
      onRefresh?.();
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error));
    } finally {
      setPendingLike(false);
    }
  };

  const handleComment = async () => {
    const content = comment.trim();
    if (!content || !postId || pendingComment) {
      return;
    }

    try {
      setPendingComment(true);
      await API.post(`/posts/${postId}/comment`, { content });
      setComment("");
      onRefresh?.();
    } catch (error) {
      Alert.alert("Error", getApiErrorMessage(error));
    } finally {
      setPendingComment(false);
    }
  };

  const createdAt = post.createdAt ?? post.created_at;

  return (
    <View style={styles.card}>
      <Text style={styles.author}>{authorName}</Text>
      <Text style={styles.date}>
        {createdAt ? formatRelativeDate(createdAt) : "Now"}
      </Text>
      <Text style={styles.content}>{post.content}</Text>

      <TouchableOpacity
        style={styles.likeButton}
        onPress={handleLike}
        disabled={pendingLike}
      >
        <Text style={styles.likeText}>
          {liked ? "❤️" : "🤍"} {likes.length} likes
        </Text>
      </TouchableOpacity>

      <View style={styles.commentRow}>
        <TextInput
          value={comment}
          onChangeText={setComment}
          placeholder="Write a comment"
          style={styles.commentInput}
        />
        <TouchableOpacity
          style={styles.commentButton}
          onPress={handleComment}
          disabled={pendingComment}
        >
          <Text style={styles.commentButtonText}>
            {pendingComment ? "..." : "Send"}
          </Text>
        </TouchableOpacity>
      </View>

      {comments.length > 0 ? (
        <FlatList
          data={comments}
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
