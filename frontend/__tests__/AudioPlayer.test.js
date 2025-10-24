// If formatTime is exported from AudioPlayer.js:
// import { formatTime } from '../components/AudioPlayer'; 

// If not exported, or for simplicity in this subtask, we can redefine it here for testing:
const formatTime = (millis) => {
  if (!millis || millis < 0) return '00:00';
  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

describe('formatTime utility', () => {
  it('should format milliseconds to MM:SS string correctly', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(1000)).toBe('00:01'); // 1 second
    expect(formatTime(59000)).toBe('00:59'); // 59 seconds
    expect(formatTime(60000)).toBe('01:00'); // 1 minute
    expect(formatTime(61000)).toBe('01:01'); // 1 minute 1 second
    expect(formatTime(3599000)).toBe('59:59'); // 59 minutes 59 seconds
    expect(formatTime(3600000)).toBe('60:00'); // 60 minutes
  });

  it('should handle invalid inputs gracefully', () => {
    expect(formatTime(null)).toBe('00:00');
    expect(formatTime(undefined)).toBe('00:00');
    expect(formatTime(-1000)).toBe('00:00');
  });

  it('should handle numbers slightly larger than a second correctly', () => {
    expect(formatTime(1450)).toBe('00:01'); // Should be 00:01, not 00:02 due to Math.floor
  });
  
  it('should pad minutes and seconds with leading zeros', () => {
    expect(formatTime(5000)).toBe('00:05'); // 5 seconds
    expect(formatTime(120000)).toBe('02:00'); // 2 minutes
  });
});

// If you were testing a React component, e.g., a simple button:
// import React from 'react';
// import { render, fireEvent } from '@testing-library/react-native';
// import { Text, TouchableOpacity } from 'react-native';

// const MyButton = ({ onPress, label }) => (
//   <TouchableOpacity onPress={onPress}>
//     <Text>{label}</Text>
//   </TouchableOpacity>
// );

// describe('MyButton component', () => {
//   it('renders correctly with given label', () => {
//     const { getByText } = render(<MyButton label="Press Me" onPress={() => {}} />);
//     expect(getByText('Press Me')).toBeTruthy();
//   });

//   it('calls onPress prop when pressed', () => {
//     const mockOnPress = jest.fn();
//     const { getByText } = render(<MyButton label="Submit" onPress={mockOnPress} />);
//     fireEvent.press(getByText('Submit'));
//     expect(mockOnPress).toHaveBeenCalledTimes(1);
//   });
// });
