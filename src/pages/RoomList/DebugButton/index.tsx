import { usePopupRef } from '@/utils/withPopup';
import { Tooltip, Button, Space } from 'antd';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useHref } from 'react-router-dom';
import { IArgs, SecretModal } from './SecretModal';
import Icon from '@ant-design/icons';
import LockSvg from '@/assets/image/lock.svg?react';

interface Props {
  room: I.SpyRoom;
  compact?: boolean;
}

export const DebugButton = ({ room, compact = false }: Props) => {
  const { t } = useTranslation();
  const { connections, address, useSecret } = room;
  const client = connections.find(({ userId }) => userId === 'Client');
  const modalRef = usePopupRef<IArgs, string>();
  const devtoolPath = useHref('/devtools');

  const startDebug = useCallback(async () => {
    try {
      if (useSecret) {
        const secret = await modalRef.current?.popup({
          address,
        });
        window.open(`${devtoolPath}?address=${address}&secret=${secret}`);
      } else {
        window.open(`${devtoolPath}?address=${address}`);
      }
    } catch (e) {}
  }, [address, devtoolPath, modalRef, useSecret]);

  return (
    <Tooltip title={!client && t('socket.client-not-in-connection')}>
      <div>
        <Button
          type="primary"
          size={compact ? 'middle' : 'large'}
          disabled={!client}
          style={{
            width: compact ? 'auto' : '100%',
            minWidth: compact ? 88 : undefined,
            pointerEvents: !client ? 'none' : 'auto',
          }}
          shape={compact ? 'default' : 'round'}
          onClick={startDebug}
        >
          <Space style={{ display: 'flex', justifyContent: 'center' }}>
            {room.useSecret && <Icon component={LockSvg} />}
            {t('common.debug')}
          </Space>
        </Button>
        <SecretModal ref={modalRef} />
      </div>
    </Tooltip>
  );
};
