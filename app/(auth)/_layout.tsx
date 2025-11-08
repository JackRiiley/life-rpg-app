import { Stack } from 'expo-router';
import React from 'react';

export default function AuthLayout() {
  // This just says "screens in this (auth) group are part of a stack"
  // We hide the header for a cleaner look
  return <Stack screenOptions={{ headerShown: false }} />;
}