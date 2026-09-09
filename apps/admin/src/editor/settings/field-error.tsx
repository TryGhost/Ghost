import { Text } from '@tryghost/shade/primitives';

/** What a settings field says about a value it will not save. */
export function FieldError({ id, message }: { id: string; message: string }) {
  return (
    <Text className="text-red" id={id} role="alert" size="sm">
      {message}
    </Text>
  );
}
