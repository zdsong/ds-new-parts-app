import React, { useState, useRef, useEffect } from 'react';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { SimpleForm, required, useNotify, useTranslate } from 'react-admin';
import CustomCard from '../compontent/CustomCard';
import PageContainer from '../compontent/PageContainer';
import FormInput from '../compontent/FormInput';
import { buttonSx, formSx } from '../styles/commonSX';
import { useNavigate, useParams } from 'react-router';
import useApiRequest from '../adapters/apiUtil';
import { deepClone, deepEqual } from '../utils/dataUtil';

// パスワードリセットフォームのタイプを宣言する
interface ResetPasswordFormData {
  resetPwd: string;
}

interface SearchFormProps {
  onSubmit?: (data: any) => void;
}

const C015: React.FC<SearchFormProps> = () => {
  const { request } = useApiRequest();
  const notify = useNotify();
  const translate = useTranslate();
  const navigate = useNavigate();
  const { cd } = useParams<{ cd: string }>();
  const [editFlg, setEditFlg] = useState(false);
  const [originalCardData, setOriginalCardData] = useState<any>({});

  const [cardData, setCardData] = useState({
    userId: '',
    password: '',
    userName: '',
    nickName: '',
    email: '',
    phonenumber: '',
    roleId: '2',
    status: '0'
  });

  useEffect(() => {
    if (cd) {
      fetchUserData(cd);
      setEditFlg(true);
    }
  }, [cd]);

  const fetchUserData = async (userId: string) => {
    try {
      const response = await request('get', 'api/system/user/info/' + userId);
      const data = response.data || {};
      const clonedData = deepClone(data);

      setCardData(data);
      setOriginalCardData(clonedData);
    } catch (error) {
    }
  };

  const sendUserData = async (data: any) => {
    const isDataChanged = !deepEqual(data, originalCardData); 

    if (!isDataChanged) {
      notify(translate('ra.message.data_not_change'), {type: 'error'})
      if (!editFlg) navigate(-1);
      return;
    }

    const apiUrl = editFlg ? 'api/system/user/update' : 'api/system/user/add';
    const response = await request('post', apiUrl, data);
    if (response.code === 200) {
      if (!editFlg) {
        navigate(-1);
      } else {
        cd && fetchUserData(cd);
      }
    }
  };

  // パスワードリセット関数
  const handleResetPassword = async (data: Record<string, any>) => {
    const resetFormData = data as ResetPasswordFormData;
    const { resetPwd } = resetFormData;

    try {
      const response = await request('post', 'api/system/user/resetPwd', { 
        userId: cardData.userId, 
        password: resetPwd.trim()
      });
      
    } catch (error) {
    }
  };

  // 利用状態の選択肢定義
  const [sysUsageStatus, setSysUsageStatus] = useState([])
  // 権限の選択肢定義（ロール一覧から動的に取得する）
  const [roleOptions, setRoleOptions] = useState<{ key: string; value: string }[]>([])

  useEffect(() => {

      const fetchCommonCode = async () => {
      try {
          const sysUsageStatusData = await request(
          'post', 
          'api/common/options',
          { cmdOptionName: 'sys_usage_status' },
          {},
          false,
          false
          );

          setSysUsageStatus(sysUsageStatusData.data)

          setOriginalCardData((prev: any) =>({
            ...prev,
            status: prev.status ? prev.status : sysUsageStatusData.data?.find((item: { isDefault: string; }) => item.isDefault === 'Y')?.key,
        }))
      } catch (error) {
          console.error(error);
      }
      }
      fetchCommonCode();
  }, []);

  // ロール一覧を取得して権限の選択肢を動的に生成する
  useEffect(() => {
    const fetchRoleOptions = async () => {
      try {
        const response = await request('get', 'api/system/role/optionselect', {}, {}, false, false);
        const roles = response?.data || [];
        setRoleOptions(roles.map((role: { roleId: string; roleName: string }) => ({
          key: String(role.roleId),
          value: role.roleName
        })));
      } catch (error) {
        console.error(error);
      }
    };
    fetchRoleOptions();
  }, []);

  const [showPwdTip, setShowPwdTip] = useState(false);

  return (
    <PageContainer title={'ユーザ情報登録・編集'}>
      <CustomCard sx={{ width: '100%' }} titleVariant={'body1'} title="ユーザ情報">
        <SimpleForm
          sx={formSx.formContainer}
          onSubmit={sendUserData}
          toolbar={false}
          values={cardData}
        >
          <div style={formSx.form2}>
            <FormInput
              structure='top-bottom'
              type={'text-halfwidth'}
              helperTextD={true}
              source="userName"
              label="ユーザID"
              readOnly={editFlg}
              validate={[required()]}
              required={!editFlg}
              placeholder='入力する必要があります'
              sx={{ width: '200px' }}
              slotProps={{
                htmlInput: {
                    maxLength: 20
                }
            }}
            />
            <div 
              style={{
                position: 'relative',
                width: '400px',
                display: 'flex',
              }}
            >
            <FormInput
              structure='top-bottom'
              type={'text-halfwidth'}
              helperTextD={true}
              source="password"
              label="パスワード"
              readOnly={editFlg}
              validate={editFlg ? [] : [required()]}
              required={!editFlg}
              placeholder='入力する必要があります'
              slotProps={{
                htmlInput: {
                    autoComplete: 'off',
                    maxLength: 256,
                    onFocus: () => !editFlg && setShowPwdTip(true),
                    onBlur: () => setShowPwdTip(false),
                    onMouseEnter: () => !editFlg && setShowPwdTip(true),
                    onMouseLeave: () => setShowPwdTip(false),
                }
              }}
              sx={{ 
                width: '400px',
                visibility: editFlg ? 'hidden' : 'visible',
              }}
            />
            <div
              style={{
                display: showPwdTip && !editFlg ? 'block' : 'none',
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                zIndex: 999,
                width: '100%',
                padding: '8px 12px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #e9ecef',
                borderRadius: '4px',
                fontSize: '12px',
                color: '#6c757d',
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                boxSizing: 'border-box',
              }}
            >
              <div>８文字以上で入力してください。</div>
              <div>大文字、小文字を含める必要があります。（A-Z/a-z）。</div>
              <div>数字を含める必要があります (0-9)。</div>
              <div>{`特殊文字を含める必要があります (#?!@$%^&*-)。`}</div>
            </div>
            </div>
            <FormInput
              structure='top-bottom'
              type={'text'}
              source="nickName"
              label="ユーザ名"
              validate={[required()]}
              required={true}
              placeholder='入力する必要があります'
              sx={{ width: '400px' }}
              slotProps={{
                htmlInput: {
                    maxLength: 128
                }
            }}
            />
            <FormInput
              structure='top-bottom'
              type={'text'}
              source="email"
              label="メールアドレス"
              sx={{ width: '400px' }}
              slotProps={{
                htmlInput: {
                    maxLength: 255
                }
            }}
            />
            <div></div>
            <FormInput
              structure='top-bottom'
              type={'filter-select'}
              choices={roleOptions}
              source="roleId"
              label="権限"
              validate={[required()]}
              required={true}
              placeholder='選択する必要があります'
              sx={{ width: '300px' }}
            />
            <FormInput
              structure='top-bottom'
              type={'text'}
              source="phonenumber"
              label="電話番号"
              sx={{ width: '300px' }}
              slotProps={{
                htmlInput: {
                    maxLength: 20
                }
            }}
            />
            <FormInput
              structure='top-bottom'
              type={'radio'}
              choices={sysUsageStatus}
              source="status"
              label="利用状態"
              validate={[required()]}
              required={true}
              sx={{ width: '300px' }}
            />
          </div>
          <div style={buttonSx.buttonBar}>
            <button
              style={buttonSx.button}
              onClick={() => { navigate(-1) }}
              type='button'
            >
              戻る
            </button>
            <button
              style={buttonSx.button}
              type="submit"
            >
              登録
            </button>
          </div>
        </SimpleForm>
      </CustomCard>

      {editFlg && (
        <CustomCard sx={{ width: '100%', marginTop: '20px' }} titleVariant={'body1'} title="パスワードセット">
          <SimpleForm
            sx={formSx.formContainer}
            onSubmit={handleResetPassword}
            toolbar={false}
            defaultValues={{ resetPwd: '' }}
          >
            <div style={formSx.form2}>
              <FormInput
                structure='top-bottom'
                type={'password'}
                source="resetPwd"
                label="パスワード"
                validate={[required()]}
                required={true}
                placeholder='入力する必要があります'
                sx={{ width: '400px' }}
                slotProps={{
                  htmlInput: {
                      maxLength: 72
                  }
              }}
              />
              <div style={buttonSx.buttonBar}>
                <button
                  style={buttonSx.button}
                  type="submit"
                >
                  リセット
                </button>
              </div>
            </div>
          </SimpleForm>
        </CustomCard>
      )}
    </PageContainer>
  );
};

export default C015;