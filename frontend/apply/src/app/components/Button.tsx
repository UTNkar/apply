import React from "react";

/**
 * Button component with an animated loading state.
 * When loading is true, displays an animated SVG border around the button.
 */
interface ButtonProps {
  className?: string;
  onClick?: (event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
  style?: React.CSSProperties;
  children: React.ReactNode;
  disabled?: boolean;
  loading?: boolean;
}

export default function Button({
  className = "",
  onClick = () => {},
  style = {},
  disabled = false,
  loading = false,
  children,
}: ButtonProps) {
  const button = React.useRef<HTMLButtonElement>(null);
  if (loading) {
  }
  const buttonWidth = button.current?.offsetWidth || 0;
  const buttonHeight = button.current?.offsetHeight || 0;
  const cornerRadius = 10;
  const borderWidth = 5;

  return (
    <button
      className={`button activeButton ${className} ${disabled ? "disabled" : ""} ${
        loading ? "loading" : ""
      }`}
      onClick={onClick}
      style={style}
      ref={button}
      disabled={disabled}
    >
      {buttonWidth && (
        <svg
          className="loading-indicator"
          viewBox={`0 0 ${buttonWidth + borderWidth * 2} ${buttonHeight + borderWidth * 2}`}
          style={{
            width: buttonWidth + borderWidth * 2,
            height: buttonHeight + borderWidth * 2,
            marginLeft: -borderWidth,
            marginTop: -borderWidth,
          }}
        >
          <path
            d={`
              M ${cornerRadius} 0
              L ${buttonWidth - cornerRadius} 0
              Q ${buttonWidth} 0 ${buttonWidth} ${cornerRadius}
              L ${buttonWidth} ${buttonHeight - cornerRadius}
              Q ${buttonWidth} ${buttonHeight} ${buttonWidth - cornerRadius} ${buttonHeight}
              L ${cornerRadius} ${buttonHeight}
              Q 0 ${buttonHeight} 0 ${buttonHeight - cornerRadius}
              L 0 ${cornerRadius}
              Q 0 0 ${cornerRadius} 0
              Z
            `}
            transform={`translate(${borderWidth}, ${borderWidth})`}
          />
        </svg>
      )}
      {children}
    </button>
  );
}
