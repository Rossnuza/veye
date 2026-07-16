import React from 'react';
import { useActiveChild, useStore, useT } from '../../store';
import { fullPhone } from '../../lib/format';
import { PhoneEntry } from '../onboarding/PhoneScreen';

export default function AddGuardianScreen({ navigation }: any) {
  const t = useT();
  const child = useActiveChild();
  const addGuardian = useStore((s) => s.addGuardian);
  return (
    <PhoneEntry
      title={t.shareAccess(child?.name ?? '')}
      sub={t.shareSub}
      cta={t.sendInvite}
      onBack={() => navigation.goBack()}
      onSubmit={async (digits) => {
        await addGuardian(fullPhone(digits));
        navigation.goBack();
      }}
    />
  );
}
