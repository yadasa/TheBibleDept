import BibleDeptAppIcon from '@assets/icons/BibleDeptAppIcon'
import classNames from 'classnames'
import React from 'react'

const AppLogo = () => (
  <div
    className={classNames(
      'mb-10 flex flex-row items-center justify-center gap-1'
    )}
  >
    <BibleDeptAppIcon colorClass="fill-neutral-10" />
    <span className="!font-['Poppins-SemiBold'] text-[36px] font-bold leading-[54px] text-neutral-10">
      BibleDept
    </span>
  </div>
)
export default AppLogo
