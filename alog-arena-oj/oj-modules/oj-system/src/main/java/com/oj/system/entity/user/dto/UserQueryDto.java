package com.oj.system.entity.user.dto;

import com.oj.common.entity.PageQueryDto;
import lombok.Data;

@Data
public class UserQueryDto extends PageQueryDto {

    private Long userId;

    private String nickName;
}
