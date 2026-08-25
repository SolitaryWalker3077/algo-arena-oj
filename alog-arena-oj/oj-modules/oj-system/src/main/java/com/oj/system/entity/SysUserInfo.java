package com.oj.system.entity;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@TableName("tb_sys_user")
public class SysUserInfo {
    @TableId(type = IdType.ASSIGN_ID)
    private Long userId;
    private String userAccount;
    private String password;
    private String nickName;
    private Long createBy;
    private LocalDateTime createTime;
    private Long updateBy;
    private LocalDateTime updateTime;
}
