"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertMessage } from "@/components/ui-custom/alert-message"
import { Users, UserPlus, Edit3, LogOut, Loader2 } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"

// ─── Interfaces ──────────────────────────────────────────────────────────────

export interface UserCountSummary {
  user_id: string
  username: string
  total_reports: number
  active_reports: number
  deleted_reports: number
  last_report_created_at: string | null
}

export interface User {
  id: string
  username: string
  role?: string
  created_at: string
}

export interface SelectedUserReport {
  id: string
  service_code: string
  id_number: string
  created_at: string
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface NewUserForm {
  username: string
  password: string
  confirmPassword: string
  role: string
}

export interface EditForm {
  username: string
  password: string
  role: string
}

export interface UsersTabProps {
  users: User[]
  userCounts: UserCountSummary[]
  selectedUserId: string | null
  selectedUserReports: SelectedUserReport[]
  loadingUserReports: boolean
  newUser: NewUserForm
  loading: boolean
  error: string | null
  success: string | null
  isEditDialogOpen: boolean
  editForm: EditForm
  actionLoading: string | null
  setNewUser: React.Dispatch<React.SetStateAction<NewUserForm>>
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>
  setIsEditDialogOpen: React.Dispatch<React.SetStateAction<boolean>>
  setSelectedUserId: React.Dispatch<React.SetStateAction<string | null>>
  onAddUser: (e: React.FormEvent) => void
  onFetchReports: (userId: string) => void
  onOpenEditDialog: (user: User) => void
  onUpdateUser: (e: React.FormEvent) => void
  onLogoutAllDevices: (userId: string) => void
  formatDate: (dateString: string) => string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getRoleLabel(role: string): string {
  switch (role) {
    case "admin": return "مسؤول النظام"
    case "supervisor": return "مشرف"
    default: return "مستخدم عادي"
  }
}

function getRoleBadgeClass(role: string): string {
  switch (role) {
    case "admin": return "bg-red-100 text-red-800"
    case "supervisor": return "bg-amber-100 text-amber-800"
    default: return "bg-blue-100 text-blue-800"
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function UsersTab({
  users,
  userCounts,
  selectedUserId,
  selectedUserReports,
  loadingUserReports,
  newUser,
  loading,
  error,
  success,
  isEditDialogOpen,
  editForm,
  actionLoading,
  setNewUser,
  setEditForm,
  setIsEditDialogOpen,
  setSelectedUserId,
  onAddUser,
  onFetchReports,
  onOpenEditDialog,
  onUpdateUser,
  onLogoutAllDevices,
  formatDate,
}: UsersTabProps) {
  return (
    <>
      {/* Summary list with per-user counts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Users className="mr-2 h-5 w-5" />
            إحصائيات المستخدمين
          </CardTitle>
        </CardHeader>
        <CardContent>
          {userCounts.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">لا توجد بيانات تقارير</p>
          ) : (
            <div className="space-y-2">
              {userCounts.map((uc) => (
                <div
                  key={uc.user_id}
                  className={`p-3 border rounded-md flex items-center justify-between cursor-pointer ${
                    selectedUserId === uc.user_id ? "bg-indigo-50 border-indigo-200" : ""
                  }`}
                  onClick={() => {
                    setSelectedUserId(uc.user_id)
                    onFetchReports(uc.user_id)
                  }}
                >
                  <div>
                    <p className="font-medium">{uc.username}</p>
                    <p className="text-xs text-muted-foreground">
                      إجمالي: {uc.total_reports} • نشط: {uc.active_reports} • معطل: {uc.deleted_reports}
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    آخر إضافة: {uc.last_report_created_at ? new Date(uc.last_report_created_at).toLocaleString("ar-SA") : "—"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add User Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <UserPlus className="mr-2 h-5 w-5" />
            إضافة مستخدم جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onAddUser} className="space-y-4">
            {error && <AlertMessage type="error" title="خطأ" message={error} />}
            {success && <AlertMessage type="success" title="نجاح" message={success} />}
            <div className="space-y-2">
              <Label htmlFor="username">اسم المستخدم</Label>
              <Input
                id="username"
                value={newUser.username}
                onChange={(e) => setNewUser((prev) => ({ ...prev, username: e.target.value }))}
                placeholder="أدخل اسم المستخدم"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">كلمة المرور</Label>
              <Input
                id="password"
                type="password"
                value={newUser.password}
                onChange={(e) => setNewUser((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="أدخل كلمة المرور"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">تأكيد كلمة المرور</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={newUser.confirmPassword}
                onChange={(e) => setNewUser((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                placeholder="أدخل تأكيد كلمة المرور"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">نوع الحساب</Label>
              <select
                id="role"
                value={newUser.role}
                onChange={(e) => setNewUser((prev) => ({ ...prev, role: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="user">مستخدم عادي</option>
                <option value="supervisor">مشرف</option>
                <option value="admin">مسؤول النظام</option>
              </select>
            </div>
            <Button type="submit" className="w-full bg-blue-500 hover:bg-blue-600" disabled={loading}>
              {loading ? "جاري الإضافة..." : "إضافة المستخدم"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center">
            <Users className="mr-2 h-5 w-5" />
            قائمة المستخدمين والإدارة
          </CardTitle>
        </CardHeader>
        <CardContent>
          {users.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">لا يوجد مستخدمين</p>
          ) : (
            <div className="space-y-4">
              {users.map((user) => {
                const stats = userCounts.find((uc) => uc.user_id === user.id)
                return (
                  <div key={user.id} className="p-4 border rounded-md bg-white shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex flex-col space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <p className="font-bold text-lg text-blue-900">{user.username}</p>
                          <div className="flex items-center gap-2">
                            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${getRoleBadgeClass(user.role || "user")}`}>{getRoleLabel(user.role || "user")}</span>
                          </div>
                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                            <span>📅 {formatDate(user.created_at)}</span>
                            <span className="text-muted-foreground">••••••••</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => onOpenEditDialog(user)}
                          >
                            <Edit3 className="h-4 w-4" />
                            <span className="sr-only">تعديل</span>
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 w-8 p-0 border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => onLogoutAllDevices(user.id)}
                            disabled={actionLoading === user.id}
                          >
                            {actionLoading === user.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <LogOut className="h-4 w-4" />
                            )}
                            <span className="sr-only">تسجيل خروج من جميع الأجهزة</span>
                          </Button>
                        </div>
                      </div>

                      {stats && (
                        <div className="grid grid-cols-3 gap-2 py-2 border-y border-gray-50 bg-gray-50/50 rounded px-2">
                          <div className="text-center">
                            <p className="text-[10px] text-muted-foreground uppercase">الإجمالي</p>
                            <p className="font-bold text-gray-700">{stats.total_reports}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-green-600 uppercase">النشطة</p>
                            <p className="font-bold text-green-700">{stats.active_reports}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[10px] text-red-400 uppercase">المعطلة</p>
                            <p className="font-bold text-red-500">{stats.deleted_reports}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex justify-between items-center pt-1">
                        <p className="text-[10px] text-muted-foreground italic">
                          آخر نشاط: {stats?.last_report_created_at ? new Date(stats.last_report_created_at).toLocaleDateString("ar-SA") : "لا يوجد"}
                        </p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-[11px] text-blue-600 hover:text-blue-800"
                          onClick={() => {
                            setSelectedUserId(user.id)
                            onFetchReports(user.id)
                          }}
                        >
                          {selectedUserId === user.id ? "إخفاء التقارير" : "عرض التقارير"}
                        </Button>
                      </div>
                    </div>

                    {selectedUserId === user.id && (
                      <div className="mt-3 border-t pt-3 animate-in slide-in-from-top-2 duration-300">
                        {loadingUserReports ? (
                          <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                          </div>
                        ) : selectedUserReports.length === 0 ? (
                          <p className="text-sm text-center text-muted-foreground py-2 italic">لا يوجد تقارير مسجلة</p>
                        ) : (
                          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                            {selectedUserReports.map((r) => (
                              <div key={r.id} className="p-2.5 rounded-md bg-blue-50/30 border border-blue-100">
                                <div className="flex justify-between text-[11px] font-medium text-blue-900">
                                  <span>رمز: {r.service_code}</span>
                                  <span>هوية: {r.id_number}</span>
                                </div>
                                <div className="text-[10px] text-muted-foreground mt-1 text-left">
                                  {new Date(r.created_at).toLocaleString("ar-SA")}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white">
          <DialogHeader>
            <DialogTitle className="text-right">تعديل بيانات المستخدم</DialogTitle>
            <DialogDescription className="text-right">قم بتعديل اسم المستخدم أو كلمة المرور الخاصة به.</DialogDescription>
          </DialogHeader>
          <form onSubmit={onUpdateUser} className="space-y-4 py-4 pr-1">
            <div className="space-y-2 text-right">
              <Label htmlFor="edit-username">اسم المستخدم</Label>
              <Input
                id="edit-username"
                value={editForm.username}
                onChange={(e) => setEditForm((prev) => ({ ...prev, username: e.target.value }))}
                className="text-right"
                required
              />
            </div>
            <div className="space-y-2 text-right">
              <Label htmlFor="edit-password">كلمة المرور الجديدة (اتركها فارغة للإبقاء على الحالية)</Label>
              <Input
                id="edit-password"
                type="password"
                value={editForm.password}
                onChange={(e) => setEditForm((prev) => ({ ...prev, password: e.target.value }))}
                className="text-right"
                placeholder="أدخل كلمة المرور الجديدة"
              />
            </div>
            <div className="space-y-2 text-right">
              <Label htmlFor="edit-role">نوع الحساب</Label>
              <select
                id="edit-role"
                value={editForm.role}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="user">مستخدم عادي</option>
                <option value="supervisor">مشرف</option>
                <option value="admin">مسؤول النظام</option>
              </select>
            </div>
            <DialogFooter className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)} className="flex-1">
                إلغاء
              </Button>
              <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700" disabled={loading}>
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "حفظ التغييرات"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
