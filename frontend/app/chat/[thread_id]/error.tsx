"use client";
const Error = ({ err }: { err: Error }) => {
  return <div>{err.message}</div>;
};

export default Error;
