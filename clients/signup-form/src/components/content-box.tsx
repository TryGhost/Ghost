import type { ComponentChildren } from 'preact';

type ContentBoxProps = {
  children: ComponentChildren;
};

export const ContentBox = ({ children }: ContentBoxProps) => {
  return <section>{children}</section>;
};
