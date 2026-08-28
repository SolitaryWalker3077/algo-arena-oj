package com.oj.system.entity.vo;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;

@Data
public class SysUserVo {
    @Schema(description = "用户账号")
    private String userAccount;

    @Schema(description = "用户昵称")
    private String nickName;
}
