import React, { useState } from 'react';
import {
  HelpCircle,
  PlusCircle,
  Send,
  User,
  Headphones,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Paperclip,
} from 'lucide-react';
import { useAppState } from '../context/AppStateContext';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Modal } from '../components/ui/Modal';
import { StatusBadge } from '../components/ui/StatusBadge';
import { EmptyState } from '../components/ui/EmptyState';
import { SupportTicket } from '../types';

interface SupportPageProps {
  onNavigate: (route: string) => void;
}

export const SupportPage: React.FC<SupportPageProps> = () => {
  const { tickets, createTicket, replyToTicket, userProfile } = useAppState();

  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [replyText, setReplyText] = useState('');

  // New ticket modal
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [subject, setSubject] = useState('');
  const [department, setDepartment] = useState<SupportTicket['department']>('technical');
  const [priority, setPriority] = useState<SupportTicket['priority']>('medium');
  const [message, setMessage] = useState('');

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    createTicket(subject, department, priority, message);
    setSubject('');
    setMessage('');
    setIsNewModalOpen(false);
  };

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !activeTicket) return;
    replyToTicket(activeTicket.id, replyText);
    setReplyText('');

    // Keep active ticket updated
    const updated = tickets.find((t) => t.id === activeTicket.id);
    if (updated) {
      setActiveTicket({
        ...updated,
        messages: [
          ...updated.messages,
          {
            id: `msg-${Date.now()}`,
            sender: 'user',
            senderName: userProfile.name,
            content: replyText,
            timestamp: 'Vừa xong',
          },
        ],
      });
    }
  };

  const deptLabels: Record<string, string> = {
    technical: 'Kỹ thuật & Môi trường',
    billing: 'Thanh toán & Hóa đơn',
    general: 'Tư vấn chung / Doanh nghiệp',
  };

  const priorityLabels: Record<string, string> = {
    low: 'Thấp',
    medium: 'Trung bình',
    high: 'Cao',
    urgent: 'Khẩn cấp',
  };

  // Sync active ticket with tickets store
  const currentViewTicket = activeTicket ? tickets.find((t) => t.id === activeTicket.id) || activeTicket : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--text-main)', letterSpacing: '-0.5px' }}>
            Hỗ trợ & Trợ giúp kỹ thuật
          </h1>
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Kết nối trực tiếp tới đội ngũ kỹ sư hạ tầng điện toán đám mây và hỗ trợ kỹ thuật 24/7.
          </p>
        </div>

        <Button variant="primary" onClick={() => setIsNewModalOpen(true)} icon={<PlusCircle size={18} />}>
          Gửi yêu cầu hỗ trợ
        </Button>
      </div>

      {/* Ticket conversation view or Ticket list */}
      {currentViewTicket ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          {/* Back button & Ticket meta */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setActiveTicket(null)}
              icon={<ArrowLeft size={16} />}
            >
              Quay lại danh sách yêu cầu
            </Button>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <StatusBadge status={currentViewTicket.status} />
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '3px 8px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--bg-sunken)',
                  color: 'var(--text-secondary)',
                }}
              >
                Ưu tiên: {priorityLabels[currentViewTicket.priority] || currentViewTicket.priority}
              </span>
            </div>
          </div>

          <Card variant="raised" padding="lg">
            <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '6px' }}>
              {currentViewTicket.subject}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Mã yêu cầu: <strong>#{currentViewTicket.id}</strong> • Bộ phận:{' '}
              <strong>{deptLabels[currentViewTicket.department] || currentViewTicket.department}</strong> • Khởi tạo lúc{' '}
              {new Date(currentViewTicket.createdAt).toLocaleDateString('vi-VN')}
            </div>

            {/* Conversation Messages Stream */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
              {currentViewTicket.messages.map((msg) => {
                const isUser = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: isUser ? 'flex-end' : 'flex-start',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: isUser ? 'var(--accent-pink)' : 'var(--text-main)' }}>
                        {msg.senderName}
                      </span>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{msg.timestamp}</span>
                    </div>

                    <div
                      style={{
                        maxWidth: '80%',
                        padding: '14px 18px',
                        borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                        background: isUser ? 'var(--accent-pink-gradient)' : 'var(--bg-sunken)',
                        color: isUser ? '#ffffff' : 'var(--text-main)',
                        boxShadow: isUser ? 'var(--accent-pink-glow)' : 'var(--nm-flat-sm)',
                        fontSize: '0.9rem',
                        lineHeight: 1.5,
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ position: 'relative' }}>
                <textarea
                  placeholder="Nhập nội dung phản hồi tới đội ngũ hỗ trợ kỹ thuật Aston Cloud..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  rows={3}
                  className="nm-input"
                  style={{ width: '100%', resize: 'vertical' }}
                  required
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button type="submit" variant="primary" icon={<Send size={15} />}>
                  Gửi phản hồi
                </Button>
              </div>
            </form>
          </Card>
        </div>
      ) : (
        /* Ticket list */
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {tickets.length === 0 ? (
            <EmptyState
              icon={<HelpCircle size={32} />}
              title="Chưa có yêu cầu hỗ trợ nào"
              description="Bạn có thắc mắc hoặc cần hỗ trợ kỹ thuật cho máy chủ? Hãy gửi yêu cầu bất cứ lúc nào."
              actionText="Gửi yêu cầu hỗ trợ"
              onAction={() => setIsNewModalOpen(true)}
            />
          ) : (
            tickets.map((t) => (
              <Card
                key={t.id}
                variant="raised"
                padding="md"
                hoverEffect
                style={{ cursor: 'pointer' }}
                onClick={() => setActiveTicket(t)}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '12px',
                        background: 'var(--accent-pink-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'var(--accent-pink)',
                      }}
                    >
                      <Headphones size={20} />
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '1.02rem', color: 'var(--text-main)' }}>
                        {t.subject}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        Mã: <strong>#{t.id}</strong> • Bộ phận:{' '}
                        <strong>{deptLabels[t.department] || t.department}</strong> • Hoạt động gần nhất:{' '}
                        {new Date(t.updatedAt).toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        background: 'var(--bg-sunken)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {priorityLabels[t.priority] || t.priority}
                    </span>
                    <StatusBadge status={t.status} size="sm" />
                    <Button variant="secondary" size="sm">
                      Xem trao đổi ({t.messages.length})
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* New Ticket Modal */}
      <Modal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        title="Gửi yêu cầu hỗ trợ kỹ thuật mới"
        maxWidth="600px"
      >
        <form onSubmit={handleCreateTicket} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <Input
            label="Tiêu đề yêu cầu"
            placeholder="Tóm tắt ngắn gọn vấn đề hoặc yêu cầu của bạn..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            autoFocus
          />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Select
              label="Bộ phận tiếp nhận"
              options={[
                { value: 'technical', label: 'Kỹ thuật & Môi trường' },
                { value: 'billing', label: 'Thanh toán & Hóa đơn' },
                { value: 'general', label: 'Tư vấn chung / Doanh nghiệp' },
              ]}
              value={department}
              onChange={(e) => setDepartment(e.target.value as any)}
            />

            <Select
              label="Mức độ ưu tiên"
              options={[
                { value: 'low', label: 'Thấp - Hỏi đáp thông tin' },
                { value: 'medium', label: 'Trung bình - Vấn đề thông thường' },
                { value: 'high', label: 'Cao - Dịch vụ gián đoạn' },
                { value: 'urgent', label: 'Khẩn cấp - Hệ thống tê liệt' },
              ]}
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.86rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Mô tả chi tiết
            </label>
            <textarea
              rows={4}
              placeholder="Cung cấp tên máy chủ cụ thể, nhật ký lỗi hoặc thông tin chi tiết..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="nm-input"
              style={{ width: '100%', resize: 'vertical' }}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <Button type="button" variant="secondary" onClick={() => setIsNewModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary">
              Gửi yêu cầu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
