package com.oj.job.entity.message;

import com.baomidou.mybatisplus.annotation.IdType;
import com.baomidou.mybatisplus.annotation.TableId;
import com.oj.common.entity.BaseEntity;
import lombok.Data;

@Data
public class MessageText extends BaseEntity {
    @TableId(value = "TEXT_ID", type = IdType.ASSIGN_ID)
    private Long textId;

    private String messageTitle;

    private String messageContent;
}
