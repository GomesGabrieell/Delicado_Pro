import { PrimaryButton } from '../design-system';

type ActionButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
};

export function ActionButton(props: ActionButtonProps) {
  return <PrimaryButton {...props} />;
}
