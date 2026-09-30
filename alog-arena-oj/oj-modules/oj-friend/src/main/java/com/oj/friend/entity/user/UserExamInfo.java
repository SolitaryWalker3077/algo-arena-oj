package com.oj.friend.entity.user;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.baomidou.mybatisplus.annotation.TableName;
import com.fasterxml.jackson.databind.annotation.JsonSerialize;
import com.fasterxml.jackson.databind.ser.std.ToStringSerializer;
import com.oj.common.entity.BaseEntity;
import lombok.Data;

@Data
@TableName("tb_user_exam")
public class UserExamInfo extends BaseEntity {

    @JsonSerialize(using = ToStringSerializer.class)
    @TableId(value = "USER_EXAM_ID", type = IdType.ASSIGN_ID)
    private Long userExamId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long examId;

    @JsonSerialize(using = ToStringSerializer.class)
    private Long userId;

    private Integer score;

    private Integer examRank;
}
