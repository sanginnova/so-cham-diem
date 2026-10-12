import React from 'react';
import { FamilyPortal } from './FamilyPortal';

export const PublicPortalView: React.FC<{ onOpenLoginModal: () => void }> = ({ onOpenLoginModal }) => <div className="space-y-6 pb-12">
  <section className="rounded-3xl bg-blue-950 text-white p-8 space-y-4">
    <h1 className="text-2xl font-bold">Sổ chấm điểm hàng ngày & quản lý rèn luyện</h1>
    <p>Giáo viên quản lý điểm và công bố báo cáo cá nhân. Học sinh, phụ huynh tra cứu bằng email được cấp quyền.</p>
    <button onClick={onOpenLoginModal} className="bg-white text-blue-900 rounded-xl px-4 py-2 font-semibold">Đăng nhập không gian giáo viên</button>
  </section>
  <FamilyPortal />
</div>;
